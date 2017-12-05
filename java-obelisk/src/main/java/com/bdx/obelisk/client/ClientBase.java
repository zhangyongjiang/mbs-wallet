package com.bdx.obelisk.client;

import java.util.Iterator;
import java.util.Map;
import java.util.Queue;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Future;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.zeromq.ZContext;
import org.zeromq.ZMQ;
import org.zeromq.ZMQ.PollItem;

import com.bdx.obelisk.filter.ResponseFilter;
import com.bdx.obelisk.handler.ResponseHandler;
import com.bdx.obelisk.message.RequestMessage;
import com.bdx.obelisk.message.ResponseMessage;
import com.google.common.util.concurrent.SettableFuture;

public class ClientBase {

	final static Logger LOG = LoggerFactory.getLogger(ClientBase.class);
	
	final static int MAX_SOCKET_SEND_FAILURES = 10;
	final static int DEFAULT_SOCKET_POOL_SIZE = 100;
	final static int DEFAULT_MIN_SOCKET_POOL_SIZE = 50;
	final static long DEFAULT_DUMPED_EXECUTORS_CLEAN_INTERVAL = 5 * 60 * 1000;
	final static long DEFAULT_MONITOR_OUTPUT_INTERVAL = 5 * 60 * 1000;
	final static long DEFAULT_REQUESTS_CLEAN_INTERVAL = 2 * 60 * 1000;
	
	private ZContext ctx;
	private String connection;
	//private ZLoop loop = new ZLoop();
	private ZMQ.Poller poller;
	
	private final Map<String, ResponseFilter> filters = new ConcurrentHashMap<String, ResponseFilter>();
	private final Map<Long, ResponseHandler> handlers = new ConcurrentHashMap<Long, ResponseHandler>();
	private final Map<Long, SettableFuture<Object>> futures = new ConcurrentHashMap<Long, SettableFuture<Object>>();
	private final Map<String, ResponseHandler> globalHandlers = new ConcurrentHashMap<String, ResponseHandler>();
	
	//private Queue<Request> requests = new ConcurrentLinkedQueue<Request>();
	private Queue<Request> requestQueue = null;
	private final Map<Long, Request> requests = new ConcurrentHashMap<Long, Request>();
	
	private Map<Integer, ZMQ.Socket> sockets = new ConcurrentHashMap<Integer, ZMQ.Socket>();
	private Map<ZMQ.Socket, ExecutorService> executors = new ConcurrentHashMap<ZMQ.Socket, ExecutorService>();
	private Map<ZMQ.Socket, Long> failures = new ConcurrentHashMap<ZMQ.Socket, Long>();
	private Map<ZMQ.Socket, Integer> socketIds = new ConcurrentHashMap<ZMQ.Socket, Integer>();
	private ConcurrentLinkedQueue<ExecutorService> dumpedExecutors = new ConcurrentLinkedQueue<ExecutorService>();
	
	private Thread loopThread;
	private Thread dumpedExecutorsCleanThread;
	private Thread monitorThread = null;
	private Thread requestsCleanThread;
	
	private ThreadPoolExecutor increaseSocketPoolExecutor = new ThreadPoolExecutor(
			1, 1, 0L, TimeUnit.MICROSECONDS,
			new LinkedBlockingQueue<Runnable>());;
	
	private Random random = new Random();
	
	private AtomicLong sendCount = new AtomicLong(0);
	private AtomicLong recvCount = new AtomicLong(0);
	
	private int socketPoolSize = DEFAULT_SOCKET_POOL_SIZE;
	private int minSocketPoolSize = DEFAULT_MIN_SOCKET_POOL_SIZE;
	
	private long dumpedExecutorsCleanInterval = DEFAULT_DUMPED_EXECUTORS_CLEAN_INTERVAL;
	private long monitorOutputInterval = DEFAULT_MONITOR_OUTPUT_INTERVAL;
	private long requestsCleanInterval = DEFAULT_REQUESTS_CLEAN_INTERVAL;
	
	private boolean monitored = false;
	
	private int ioThreads = 2;
	
	private int requestQueueSize = 3000;
	
	private AtomicBoolean running = new AtomicBoolean(false);
	private volatile int nextSocketId = 0;
	
	private SocketEventListener socketEventListener;
	
	public ClientBase(String connection){
		this.connection = connection;
	}
	
	public void setup(){
		this.ctx = new ZContext(ioThreads);
		this.ctx.getContext().setMaxSockets(100000);
		
		poller = new ZMQ.Poller(socketPoolSize);
		
		for (int i = 0; i < socketPoolSize; i++){
			setupSocket(nextSocketId++);
		}
		
		requestQueue = new LinkedBlockingQueue<Request>(requestQueueSize);
		
		setupThreads();
		
		running = new AtomicBoolean(true);
	}
	
	protected void setupSocket(int id){
		ZMQ.Socket socket = this.ctx.createSocket(ZMQ.DEALER);
		socket.connect(connection);
		socket.setLinger(0);
		// socket.setIdentity(((Integer)i).toString().getBytes());	// don't use this for id
		socket.setReceiveTimeOut(200);
		socket.setSendTimeOut(200);
		
		ZMQ.PollItem item = new ZMQ.PollItem(socket, ZMQ.Poller.POLLIN);
		poller.register(item);
		// TODO unregister the socket on send fail
		/*
		loop.addPoller(item, new ZLoop.IZLoopHandler(){

			public int handle(ZLoop loop, PollItem item, Object o) {
				if (item.isReadable()){
					receive(item.getSocket());
				}
				return 0;
			}
			
		}, this);
		*/
		
		ExecutorService executor = new ThreadPoolExecutor(1, 1,
                0L, TimeUnit.MICROSECONDS,
                new LinkedBlockingQueue<Runnable>());
		executors.put(socket, executor);
		sockets.put(id, socket);
		socketIds.put(socket, id);
	}
	
	protected void setupThreads(){
		loopThread = new Thread(new Runnable(){
			public void run() {
				//loop.start();
				
				while(!Thread.currentThread().isInterrupted()){
					int poll = poller.poll(1000);
					if (LOG.isDebugEnabled()){
						LOG.debug("poller poll :" + poll);
					}
					//System.out.println("poller poll :" + poll);
					if (poll > 0){
						for (int i = 0; i < poller.getSize(); i++){
							PollItem item = poller.getItem(i);
							if (item != null && item.isReadable()){
								try{
									receive(item.getSocket());
								} catch (Exception ex){
									LOG.error(ex.toString());
								}
							}
//							if (poller.pollin(i)){
//								try{
//									receive(poller.getItem(i).getSocket());
//								} catch (Exception ex){
//									LOG.error(ex.toString());
//								}
//							}
						}
					}
				}
			}
		});
		loopThread.setPriority(10);
		loopThread.start();
		
		dumpedExecutorsCleanThread = new Thread(new Runnable(){
			public void run() {
				while(!Thread.currentThread().isInterrupted()){
					if (!dumpedExecutors.isEmpty()){
						ExecutorService e = dumpedExecutors.poll();
						e.shutdown();
						if (LOG.isDebugEnabled()){
							LOG.debug("shutdown one dumped executor");
						}
					}
					try {
						Thread.sleep(dumpedExecutorsCleanInterval);
					} catch (InterruptedException e) {
						e.printStackTrace();
					}
				}
			}
		});
		dumpedExecutorsCleanThread.start();
		
		if (monitored) {
			monitorThread = new Thread(new Runnable(){
				public void run() {
					while(!Thread.currentThread().isInterrupted()){
						Iterator<ZMQ.Socket> iterator = executors.keySet().iterator();
						while (iterator.hasNext()){
							ZMQ.Socket socket = (ZMQ.Socket)iterator.next();
							ThreadPoolExecutor executor = (ThreadPoolExecutor)executors.get(socket);
							StringBuilder out = new StringBuilder();
							out.append("socket[").append(socket.hashCode()).append("] - ");
							out.append("active count ").append(executor.getActiveCount()).append(", ");
							out.append("completed count ").append(executor.getCompletedTaskCount()).append(", ");
							out.append("queue size ").append(executor.getQueue().size());
							if (LOG.isInfoEnabled()){
								LOG.info(out.toString());
							}
						}
						try {
							Thread.sleep(monitorOutputInterval);
						} catch (InterruptedException e) {
							e.printStackTrace();
						}
					}
				}
			});
			monitorThread.start();
		}
		
		requestsCleanThread = new Thread(new Runnable(){
			public void run() {
				while(!Thread.currentThread().isInterrupted()){
					LOG.warn("size of request queue : " + requestQueue.size());
					if (!requestQueue.isEmpty()) {
						long now = System.currentTimeMillis();
						while (true) {
							Request request = requestQueue.peek();
							if (request != null && now - request.getTimestamp() > 60000) {	// one minute
								requestQueue.poll();
								handlers.remove(request.getMessage().getId());
								futures.remove(request.getMessage().getId());
								requests.remove(request.getMessage().getId());
							} else {
								break;
							}
						}
					}
					try {
						Thread.sleep(requestsCleanInterval);
					} catch (InterruptedException e) {
						e.printStackTrace();
					}
				}
			}
		});
		requestsCleanThread.start();
	}
	
	public Future<Object> request(String command, byte[] data, final ResponseHandler handler) {
		return this.request(command, data, handler, null);
	}
	
	public Future<Object> request(String command, byte[] data, final ResponseHandler handler, Integer socketId) {
		if (!running.get())
			throw new RuntimeException("service is not running.");
		
		RequestMessage message = new RequestMessage(command, data);
		final Request request = new Request(message, System.currentTimeMillis());
		requestQueue.add(request);
		
		ZMQ.Socket skt;
		if (socketId == null){
			while (true) {
				int sId = random.nextInt(nextSocketId);
				skt = sockets.get(sId);
				if (skt != null) {
					socketId = sId;
					break ;
				}
			}
		} else {
			skt = sockets.get(socketId);
			if (skt == null)
				throw new RuntimeException("socket not found.");
		}
		
//		while (true) {
//			try {
//				int sIndex = random.nextInt(sockets.size());
//				skt = sockets.get(sIndex);
//				break ;
//			} catch (IndexOutOfBoundsException ex) {
//				LOG.warn(ex.getMessage());;
//			}
//		}
		
		final ZMQ.Socket socket = skt;
		final Integer id = socketId;
		final SettableFuture<Object> future = SettableFuture.create();
		
		Runnable task = new Runnable(){
			public void run() {
				try{
					if (handler != null)
						handlers.put(request.getMessage().getId(), handler);
					futures.put(request.getMessage().getId(), future);
					requests.put(request.getMessage().getId(), request);
					send(id, socket, request.getMessage());
					if (LOG.isDebugEnabled())
						LOG.debug("sent count - " + sendCount.incrementAndGet());
				} catch (Exception ex) {
					LOG.error(ex.getMessage());
				}
			}
		};
		
		executors.get(socket).submit(task);
		
		return future;
	}

	protected void send(Integer socketId, ZMQ.Socket socket, RequestMessage message){
		if (message.send(socket)){
			failures.remove(socket);
			
			if (LOG.isDebugEnabled())
				LOG.debug("sent successfully - socket[" + socket.hashCode() + "]");
		} else {
			LOG.error("sent failure - socket[" + socket.hashCode() + "]");
			onSendFailure(socketId, socket);
		}
	}
	
	protected void onSendFailure(Integer socketId, ZMQ.Socket socket){
		Long failure = failures.get(socket);
		if (failure == null)
			failure = 0L;
		failures.put(socket, ++failure);
		if (failure > MAX_SOCKET_SEND_FAILURES){
			// remove the socket
			this.removeSocket(socketId, socket);
			
			// increase socket pool if necessary
			if (sockets.size() < minSocketPoolSize){
				Runnable task = new Runnable(){
					public void run() {
						int size = sockets.size();
						// double check to avoid double increase
						if (size < minSocketPoolSize){
							for (int i = 0; i < (socketPoolSize - size); i++){
								setupSocket(nextSocketId++);
							}
							if (LOG.isDebugEnabled())
								LOG.debug("increase socket pool - " + (socketPoolSize - size));
						}
					}
				};
				increaseSocketPoolExecutor.submit(task);
			}
		}
	}
	
	protected void removeSocket(Integer socketId, ZMQ.Socket socket){
		// remove the socket to avoid service coming request
		sockets.remove(socketId);
		
		if (LOG.isDebugEnabled())
			LOG.debug("socket[" + socketId + "] removed");
		
		// stop poll the socket
		//loop.removePoller(new ZMQ.PollItem(socket, ZMQ.Poller.POLLIN));
		poller.unregister(socket);
		
		// destroy the socket
		if (LOG.isDebugEnabled())
			LOG.debug("destroy socket start");
		
		ctx.destroySocket(socket);
		
		if (LOG.isDebugEnabled())
			LOG.debug("destroy socket finish");
		
		// clear the request queue, don't re-send request because timeout request will be retry to send (retry move to caller).
		// don't shutdown executor here, avoid lock thread 
		ThreadPoolExecutor e = (ThreadPoolExecutor)executors.remove(socket);
		e.getQueue().clear();
		dumpedExecutors.add(e);
		
		failures.remove(socket);
		socketIds.remove(socket);
		if (socketId != null && socketEventListener != null)
			socketEventListener.onRemove(socketId);;
	}
	
	public interface SocketEventListener {
		void onRemove(Integer socketId);
	}
	
	protected void receive(final ZMQ.Socket socket){
		final ResponseMessage message = new ResponseMessage();
		final Integer socketId = socketIds.get(socket);
		if (message.recv(socket)) {
			Runnable task = new Runnable() {
				@Override
				public void run() {
					process(message, socketId);
				}
			};
			executors.get(socket).submit(task);
		}
	}
	
	protected void process(ResponseMessage message, Integer socketId){
		if (LOG.isDebugEnabled())
			LOG.debug("received count - " + recvCount.incrementAndGet());
		/*
		 * if any of these succeed then process() stops.
		 */
		try {
			// apply filters 
			if (processFilters(message))
				return ;
			
			// apply handlers
			if (processHandler(message, socketId))
				return ;
			
			// apply global handlers
			if (processGlobalHandler(message, socketId))
				return ;
		} finally {
			handlers.remove(message.getId());
			futures.remove(message.getId());
			Request request = requests.remove(message.getId());
			if (request != null)
				requestQueue.remove(request);
		}
	}
	
	protected boolean processFilters(ResponseMessage message){
		ResponseFilter filter = filters.get(message.getCommand());
		if (filter == null)
			return false;
		filter.doFilter(message.getData());
		return true;
	}
	
	protected boolean processHandler(ResponseMessage message, Integer socketId){
		ResponseHandler handler = handlers.get(message.getId());
		SettableFuture<Object> future = futures.get(message.getId());
		if (handler == null)
			return false;
		
		handler.doHandle(message.getData(), future, socketId);
		
		return true;
	}
	
	protected boolean processGlobalHandler(ResponseMessage message, Integer socketId){
		ResponseHandler handler = globalHandlers.get(message.getCommand());
		SettableFuture<Object> future = futures.get(message.getId());
		if (handler == null)
			return false;
		
		handler.doHandle(message.getData(), future, socketId);
		
		return true;
	}
	
	public void appendFilter(String command, ResponseFilter filter){
		filters.put(command, filter);
	}

	public void appendGlobalHandler(String command, ResponseHandler handler){
		globalHandlers.put(command, handler);
	}
	
	public void destroy(){
		// stop to service new request
		running.set(false);
		
		// stop to increase socket pool
		increaseSocketPoolExecutor.getQueue().clear();
		increaseSocketPoolExecutor.shutdown();
		
		// stop the loop thread
		if (loopThread != null) {
			loopThread.interrupt();
			try {
				loopThread.join();
			} catch (InterruptedException e) {
				LOG.error(e.getMessage());
			}
		}
		
		// stop the dumped executors clean thread
		dumpedExecutorsCleanThread.interrupt();
		try {
			dumpedExecutorsCleanThread.join();
		} catch (InterruptedException e) {
			LOG.error(e.getMessage());
		}
		
		// stop the monitor thread
		if (monitorThread != null) {
			monitorThread.interrupt();
			try {
				monitorThread.join();
			} catch (InterruptedException e) {
				LOG.error(e.getMessage());
			}
		}
		
		// stop the requests clean thread
		requestsCleanThread.interrupt();
		try {
			requestsCleanThread.join();
		} catch (InterruptedException e) {
			LOG.error(e.getMessage());
		}
		
		// shutdown all dumped executors
		while(!dumpedExecutors.isEmpty()){
			dumpedExecutors.poll().shutdownNow();
		}
		
		// shutdown all executors
		Iterator<ExecutorService> iterator = executors.values().iterator();
		while (iterator.hasNext()){
			ThreadPoolExecutor executor = (ThreadPoolExecutor)iterator.next();
			executor.getQueue().clear();
			try {
				executor.shutdown();
			} catch (Exception e) {
				LOG.error(e.getMessage());
			}
		}
		
		// destroy ZeroMQ context
		if (LOG.isInfoEnabled())
			LOG.info("ZeroMQ context destroy start");
		ctx.destroy();
		if (LOG.isInfoEnabled())
			LOG.info("ZeroMQ context destroy finish");
	}

	public int getSocketPoolSize() {
		return socketPoolSize;
	}

	public void setSocketPoolSize(int socketPoolSize) {
		this.socketPoolSize = socketPoolSize;
	}

	public long getDumpedExecutorsCleanInterval() {
		return dumpedExecutorsCleanInterval;
	}

	public void setDumpedExecutorsCleanInterval(long dumpedExecutorsCleanInterval) {
		this.dumpedExecutorsCleanInterval = dumpedExecutorsCleanInterval;
	}

	public long getMonitorOutputInterval() {
		return monitorOutputInterval;
	}

	public void setMonitorOutputInterval(long monitorOutputInterval) {
		this.monitorOutputInterval = monitorOutputInterval;
	}

	public int getMinSocketPoolSize() {
		return minSocketPoolSize;
	}

	public void setMinSocketPoolSize(int minSocketPoolSize) {
		this.minSocketPoolSize = minSocketPoolSize;
	}

	public void setSocketEventListener(SocketEventListener socketEventListener) {
		this.socketEventListener = socketEventListener;
	}

	public void setRequestsCleanInterval(long requestsCleanInterval) {
		this.requestsCleanInterval = requestsCleanInterval;
	}

	public void setIoThreads(int ioThreads) {
		this.ioThreads = ioThreads;
	}

	public void setMonitored(boolean monitored) {
		this.monitored = monitored;
	}

	public void setRequestQueueSize(int requestQueueSize) {
		this.requestQueueSize = requestQueueSize;
	}
	
}
