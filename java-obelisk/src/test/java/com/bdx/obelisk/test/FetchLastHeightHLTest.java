package com.bdx.obelisk.test;

import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ScheduledExecutorService;

import com.bdx.obelisk.client.Client;
import com.bdx.obelisk.client.ClientBase;
import org.bitcoinj.core.AddressFormatException;

public class FetchLastHeightHLTest {

	static class FetchLastHeightTask extends Thread{
		
		Client client;
		
		public FetchLastHeightTask(Client client){
			this.client = client;
		}
		
		public void run() {
			for (int i = 0; i < 10; i++){
				Future<Object> future = client.getBlockchain().fetchLastHeight();
				if (i % 2 == 1){
					future.cancel(true);
					continue ;
				}
				try {
					long height = (Long)future.get();//30, TimeUnit.SECONDS
					System.out.println("future : " + height);
				} catch (InterruptedException e) {
					e.printStackTrace();
				} catch (ExecutionException e) {
					e.printStackTrace();
				} 
//				catch (TimeoutException e) {
//					e.printStackTrace();
//				}
				
			}
		}
	}
	
	public static void main(String[] args) throws AddressFormatException {
		// 85.25.198.97 94.242.229.209
		//ClientBase clientBase = new ClientBase("tcp://94.242.229.209:9091");
		ClientBase clientBase = new ClientBase("tcp://192.168.8.105:9091");
		clientBase.setDumpedExecutorsCleanInterval(1000);
		clientBase.setMonitorOutputInterval(3 * 1000);
		clientBase.setSocketPoolSize(100);
		clientBase.setMinSocketPoolSize(200);
		clientBase.setup();
		
		final Client client = new Client(clientBase);
		
		final ScheduledExecutorService scheduledExecutor = Executors.newScheduledThreadPool(50); 
		
		//client.getSubscriber().subscribe("19kFkYEHqUZNciNzvCK7fgmTX2921q6Kd5", null, null);
		
		for (int i = 0; i < 5; i++){
			FetchLastHeightTask fetchTask = new FetchLastHeightTask(client);
			scheduledExecutor.submit(fetchTask);
		}
		
//		try {
//			Thread.sleep(3 * 1000);
//		} catch (InterruptedException e) {
//			e.printStackTrace();
//		}
//		
//		for (int i = 0; i < 5; i++){
//			FetchLastHeightTask fetchTask = new FetchLastHeightTask(client);
//			scheduledExecutor.submit(fetchTask);
//		}
		
		Runtime.getRuntime().addShutdownHook(new Thread() {
			@Override
			public void run() {
				System.out.println("Inside Add Shutdown Hook");
				scheduledExecutor.shutdownNow();
				System.out.println("scheduledExecutor.shutdownNow()");
				client.destroy();
				System.out.println("client.destroy()");
			}
		});
	}

}
