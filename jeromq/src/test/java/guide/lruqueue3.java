/*
    Copyright (c) 2007-2014 Contributors as noted in the AUTHORS file

    This file is part of 0MQ.

    0MQ is free software; you can redistribute it and/or modify it under
    the terms of the GNU Lesser General Public License as published by
    the Free Software Foundation; either version 3 of the License, or
    (at your option) any later version.

    0MQ is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Lesser General Public License for more details.

    You should have received a copy of the GNU Lesser General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

package guide;

import java.util.LinkedList;
import java.util.Queue;

import org.zeromq.ZLoop;
import org.zeromq.ZMQ;
import org.zeromq.ZMQ.PollItem;
import org.zeromq.ZMQ.Socket;
import org.zeromq.ZContext;
import org.zeromq.ZFrame;
import org.zeromq.ZMsg;

class ClientThread3 extends Thread
{
    public void run()
    {
        ZContext context = new ZContext();

        //  Prepare our context and sockets
        Socket client = context.createSocket(ZMQ.REQ);

        //  Initialize random number generator
        client.connect("ipc://frontend.ipc");

        //  Send request, get reply
        while (true) {
            client.send("HELLO".getBytes(ZMQ.CHARSET), 0);
            byte[] data = client.recv(0);

            if (data == null)
                break;
            String reply = new String(data, ZMQ.CHARSET);
            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
            }

            System.out.println(Thread.currentThread().getName() + " Client Sent HELLO");

        }
        context.destroy();
    }
}

class WorkerThread3 extends Thread
{

    public void run()
    {
        ZContext context = new ZContext();
        //  Prepare our context and sockets
        Socket worker = context.createSocket(ZMQ.REQ);

        worker.connect("ipc://backend.ipc");

        ZFrame frame = new ZFrame(lruqueue3.LRU_READY);
        //  Tell backend we're ready for work
        frame.send(worker, 0);

        while (true) {
            ZMsg msg = ZMsg.recvMsg(worker);
            if (msg == null)
                break;

            msg.getLast().reset("OK".getBytes(ZMQ.CHARSET));

            msg.send(worker);
            System.out.println(Thread.currentThread().getName() + " Worker Sent OK");
        }

        context.destroy();
    }
}

//Our LRU queue structure, passed to reactor handlers
class LRUQueueArg
{
    Socket frontend;             //  Listen to clients
    Socket backend;              //  Listen to workers
    Queue<ZFrame> workers;       //  List of ready workers
};


//In the reactor design, each time a message arrives on a socket, the
//reactor passes it to a handler function. We have two handlers; one
//for the frontend, one for the backend:

class FrontendHandler implements ZLoop.IZLoopHandler
{

    @Override
    public int handle(ZLoop loop, PollItem item, Object arg_)
    {

        LRUQueueArg arg = (LRUQueueArg) arg_;
        ZMsg msg = ZMsg.recvMsg(arg.frontend);
        if (msg != null) {
            msg.wrap(arg.workers.poll());
            msg.send(arg.backend);

            //  Cancel reader on frontend if we went from 1 to 0 workers
            if (arg.workers.size() == 0) {
                PollItem poller = new PollItem(arg.frontend, ZMQ.Poller.POLLIN);
                loop.removePoller(poller);
            }
        }
        return 0;
    }

}

class BackendHandler implements ZLoop.IZLoopHandler
{

    @Override
    public int handle(ZLoop loop, PollItem item, Object arg_)
    {

        LRUQueueArg arg = (LRUQueueArg) arg_;
        ZMsg msg = ZMsg.recvMsg(arg.backend);
        if (msg != null) {
            ZFrame address = msg.unwrap();
            //  Queue worker address for LRU routing
            arg.workers.add(address);

            //  Enable reader on frontend if we went from 0 to 1 workers
            if (arg.workers.size() == 1) {
                PollItem poller = new PollItem(arg.frontend, ZMQ.Poller.POLLIN);
                loop.addPoller(poller, lruqueue3.handle_frontend, arg);
            }

            //  Forward message to client if it's not a READY
            ZFrame frame = msg.getFirst();
            if (new String(frame.getData(), ZMQ.CHARSET).equals(lruqueue3.LRU_READY))
                msg.destroy();
            else
                msg.send(arg.frontend);
        }
        return 0;
    }

}

public class lruqueue3
{

    public final static String LRU_READY = "\001";
    protected final static FrontendHandler handle_frontend = new FrontendHandler();
    protected final static BackendHandler handle_backend = new BackendHandler();

    public static void main(String[] args)
    {
        ZContext context = new ZContext();
        LRUQueueArg arg = new LRUQueueArg();
        //  Prepare our context and sockets
        Socket frontend = context.createSocket(ZMQ.ROUTER);
        Socket backend = context.createSocket(ZMQ.ROUTER);
        arg.frontend = frontend;
        arg.backend = backend;


        frontend.bind("ipc://frontend.ipc");
        backend.bind("ipc://backend.ipc");

        int client_nbr;
        for (client_nbr = 0; client_nbr < 10; client_nbr++)
            new ClientThread3().start();

        int worker_nbr;
        for (worker_nbr = 0; worker_nbr < 3; worker_nbr++)
            new WorkerThread3().start();

        //  Queue of available workers
        arg.workers = new LinkedList<ZFrame>();

        //  Prepare reactor and fire it up
        ZLoop reactor = new ZLoop();
        reactor.verbose(true);
        PollItem poller = new PollItem(arg.backend, ZMQ.Poller.POLLIN);
        reactor.addPoller(poller, handle_backend, arg);
        reactor.start();
        reactor.destroy();


        for (ZFrame frame : arg.workers) {
            frame.destroy();
        }

        context.destroy();

        System.exit(0);

    }

}
