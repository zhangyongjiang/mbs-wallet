package com.bdx.obelisk.test;

import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;

import org.bitcoinj.core.Address;
import org.bitcoinj.core.Transaction;

import com.bdx.obelisk.client.Client;
import com.bdx.obelisk.client.ClientBase;
import com.bdx.obelisk.client.Subscriber.Listener;

public class SubscriberTest {

	public static void main(String[] args) throws InterruptedException, ExecutionException {
		// 85.25.198.97 94.242.229.209
		//ClientBase clientBase = new ClientBase("tcp://94.242.229.209:9091");
		ClientBase clientBase = new ClientBase("tcp://192.168.8.108:9091");
		clientBase.setDumpedExecutorsCleanInterval(1000);
		clientBase.setMonitorOutputInterval(60 * 1000);
		clientBase.setSocketPoolSize(5);
		clientBase.setMinSocketPoolSize(5);
		clientBase.setup();

		final Client client = new Client(clientBase);
		client.getSubscriber().setGlobalListener(new Listener(){
			@Override
			public void onUpdate(Address addr, long height, byte[] blockHash,
					Transaction tx) {
				System.out.println("onUpdate - " + tx.getHashAsString() + "," + height);
			}
			@Override
			public void onSocketRemove(Integer socketId) {
				System.out.println("onSocketRemove - " + socketId);
			}
		});
		
		// sd address : 1Dice6jaRAjTeJCp2SXi7Xr6XEmL4GiQGX
		Future<Object> f = client.getSubscriber().subscribe("1B81gTkK9GjRGp7qZFsPXELzCstYfYLcjK");
		//System.out.println("subscribe : " + (Boolean)f.get());	// socketId
		
	}

}
