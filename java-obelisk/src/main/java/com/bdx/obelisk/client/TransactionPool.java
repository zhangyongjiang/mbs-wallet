package com.bdx.obelisk.client;

import java.util.concurrent.Future;

import org.apache.commons.lang.ArrayUtils;
import org.spongycastle.util.encoders.Hex;

import com.bdx.obelisk.handler.FetchTransactionHandler;

public class TransactionPool {
	
	private ClientBase clientBase;

	public TransactionPool(ClientBase clientBase) {
		clientBase.appendGlobalHandler("transaction_pool.fetch_transaction", new FetchTransactionHandler());
		this.clientBase = clientBase;
	}

	public Future<Object> fetchTransaction(byte[] txHash) {
		ArrayUtils.reverse(txHash);
		Future<Object> f = clientBase.request("transaction_pool.fetch_transaction", txHash, null);
		return f;
	}
	
	public Future<Object> fetchTransaction(String txHash) {
		return this.fetchTransaction(Hex.decode(txHash));
	}
	
}
