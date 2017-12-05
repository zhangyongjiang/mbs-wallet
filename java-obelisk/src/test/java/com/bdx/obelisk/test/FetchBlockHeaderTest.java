package com.bdx.obelisk.test;

import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.TimeZone;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;

import org.apache.commons.codec.binary.Hex;

import com.bdx.obelisk.client.Client;
import com.bdx.obelisk.client.ClientBase;
import com.bdx.obelisk.domain.BlockHeader;

public class FetchBlockHeaderTest {

	public static void main(String[] args) {
		// 85.25.198.97 94.242.229.209
		//ClientBase clientBase = new ClientBase("tcp://85.25.198.97:9091");
		ClientBase clientBase = new ClientBase("tcp://192.168.8.105:9091");
		clientBase.setDumpedExecutorsCleanInterval(1000);
		clientBase.setMonitorOutputInterval(3 * 1000);
		clientBase.setSocketPoolSize(5);
		clientBase.setMinSocketPoolSize(5);
		clientBase.setup();

		final Client client = new Client(clientBase);
		Future<Object> future = client.getBlockchain().fetchBlockHeader(324508);
		try {
			BlockHeader header = (BlockHeader)future.get();
			System.out.println(header.getNonce());
			System.out.println(header.getBits());
			System.out.println(header.getTimestamp());
			System.out.println(new Date(header.getTimestamp() * 1000));
			System.out.println(Hex.encodeHexString(header.getMerkle()));
			System.out.println(Hex.encodeHexString(header.getPreviousBlockHash()));
			
			DateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
			Calendar c = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
			c.setTimeInMillis(header.getTimestamp() * 1000);
			System.out.println(format.format(c.getTime()));
			
		} catch (InterruptedException | ExecutionException e) {
			e.printStackTrace();
		}
	}

}
