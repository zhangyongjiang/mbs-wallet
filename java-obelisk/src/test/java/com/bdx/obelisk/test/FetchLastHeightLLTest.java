package com.bdx.obelisk.test;

import org.apache.commons.io.EndianUtils;
import org.apache.commons.lang.math.JVMRandom;
import org.zeromq.ZMQ;
import org.zeromq.ZMsg;

public class FetchLastHeightLLTest {
	public static void main(String[] args) throws Exception {
		ZMQ.Context context = ZMQ.context(1);
		ZMQ.Socket socket = context.socket(ZMQ.DEALER);

		System.out.println("Connecting to obelisk server...");
		//socket.connect ("tcp://94.242.229.209:9091");
		socket.connect("tcp://192.168.8.108:9091");
		socket.setLinger(0);

		System.out.println("Send request...");
		String requestString = "blockchain.fetch_last_height";
		socket.send(requestString, ZMQ.SNDMORE);
		long txId = JVMRandom.nextLong((long) Integer.MAX_VALUE + Integer.MAX_VALUE + 1);
		byte[] result = new byte[4];
		EndianUtils.writeSwappedInteger(result, 0, (int)txId);
		socket.send(result, ZMQ.SNDMORE);
		socket.send(new byte[]{}, 0);

		System.out.println("txId: " + txId);
		
		ZMQ.Poller poller = new ZMQ.Poller(1);
		ZMQ.PollItem pollItem = new ZMQ.PollItem(socket, ZMQ.Poller.POLLIN);
		poller.register(pollItem);
		while (!Thread.currentThread().isInterrupted()) {  
			poller.poll(1000);
			if (pollItem.isReadable()) { 
				ZMsg msg = ZMsg.recvMsg(pollItem.getSocket());
				System.out.println("-----------------------------------------");
				
				System.out.println(msg.popString());
				
				long _txid = EndianUtils.readSwappedUnsignedInteger(msg.pop().getData(), 0);
				System.out.println(_txid);
				
				byte[] bytes = msg.pop().getData();
				long errorCode = EndianUtils.readSwappedUnsignedInteger(bytes, 0);
				System.out.println(errorCode);
				
				long height = EndianUtils.readSwappedUnsignedInteger(bytes, 4);
				System.out.println(height);
			}
		}
	}
}
