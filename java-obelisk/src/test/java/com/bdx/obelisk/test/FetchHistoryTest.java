package com.bdx.obelisk.test;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import org.apache.commons.codec.binary.Hex;
import org.bitcoinj.core.AddressFormatException;

import com.bdx.obelisk.client.Client;
import com.bdx.obelisk.client.ClientBase;
import com.bdx.obelisk.domain.History;

public class FetchHistoryTest {

	@SuppressWarnings("unchecked")
	public static void main(String[] args) throws AddressFormatException, InterruptedException, ExecutionException, TimeoutException {
		// 85.25.198.97 94.242.229.209
		//ClientBase clientBase = new ClientBase("tcp://94.242.229.209:9091");
		ClientBase clientBase = new ClientBase("tcp://192.168.8.108:9091");
		clientBase.setDumpedExecutorsCleanInterval(1000);
		clientBase.setMonitorOutputInterval(3 * 1000);
		clientBase.setSocketPoolSize(5);
		clientBase.setMinSocketPoolSize(5);
		clientBase.setup();

		final Client client = new Client(clientBase);
		
		
		List<Long> times = new ArrayList<Long>();
		
		List<Future<Object>> futures = new ArrayList<Future<Object>>();
		
		for (int i = 0; i < 1; i++) {
			long start = System.currentTimeMillis();
			Future<Object> f = client.getSubscriber().fetchHistory("1PjCfs2QUbHLR2uQQcjXac98ffvYkUsado", 324396);
			futures.add(f);
			
			List<History> histories = (List<History>)f.get(20, TimeUnit.SECONDS);
			
			long pass = System.currentTimeMillis() - start;
			//System.out.println("time pass : " + pass);
			
			times.add(pass);
			
			System.out.println(histories.size());
			for (History h : histories){
				System.out.print(h.getOutputHeight());
				System.out.print(",");
				System.out.print(h.getOutput().getIndex());
				System.out.print(",");
				System.out.print(Hex.encodeHexString(h.getOutput().getHash()));
				System.out.print(",");
				System.out.print(h.getValue());
				System.out.print(",");
				System.out.print(h.getSpendHeight());
				System.out.print(",");
				System.out.print(h.getSpend().getIndex());
				System.out.print(",");
				System.out.print(Hex.encodeHexString(h.getSpend().getHash()));
				System.out.println();
			}
		}
		
		long totalTime = 0;
		for (Long time : times) {
			totalTime = totalTime + time;
		}
		System.out.println("total time : " + totalTime);
		
		
	}

}
