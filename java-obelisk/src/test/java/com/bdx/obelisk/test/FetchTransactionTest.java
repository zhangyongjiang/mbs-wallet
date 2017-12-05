package com.bdx.obelisk.test;

import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;

import org.spongycastle.util.encoders.Hex;

import com.bdx.obelisk.client.Client;
import com.bdx.obelisk.client.ClientBase;

import org.bitcoinj.core.Transaction;
import org.bitcoinj.core.TransactionInput;
import org.bitcoinj.core.TransactionOutput;
import org.bitcoinj.params.MainNetParams;

public class FetchTransactionTest {

	public static void main(String[] args) throws InterruptedException, ExecutionException {
		// 85.25.198.97 94.242.229.209
		//ClientBase clientBase = new ClientBase("tcp://85.25.198.97:9091");
		ClientBase clientBase = new ClientBase("tcp://192.168.8.108:9091");
		clientBase.setDumpedExecutorsCleanInterval(1000);
		clientBase.setMonitorOutputInterval(3 * 1000);
		clientBase.setSocketPoolSize(5);
		clientBase.setMinSocketPoolSize(5);
		clientBase.setup();

		final Client client = new Client(clientBase);

		Future<Object> f = client.getBlockchain().fetchTransaction(Hex.decode("516a4fe33d99edcfb500aab499d93d9a6d4133d46860f0d7716781ab65002e69"));
		Transaction tx = (Transaction)f.get();
		System.out.println(tx.getMessageSize());
		//System.out.println(tx.getInput(0).getOutpoint().toString());
		for (TransactionInput input : tx.getInputs()) {
			System.out.println(input.getOutpoint().toString());
		}
		for (TransactionOutput output : tx.getOutputs()) {
			System.out.println(output.getAddressFromP2PKHScript(MainNetParams.get()));
			System.out.println(output.getAddressFromP2SH(MainNetParams.get()));
		}
	}

}
