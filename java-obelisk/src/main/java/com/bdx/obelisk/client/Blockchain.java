package com.bdx.obelisk.client;

import java.util.concurrent.Future;

import org.apache.commons.io.EndianUtils;
import org.apache.commons.lang.ArrayUtils;
import org.spongycastle.util.encoders.Hex;

import com.bdx.obelisk.handler.FetchBlockHeaderHandler;
import com.bdx.obelisk.handler.FetchLastHeightHandler;
import com.bdx.obelisk.handler.FetchTransactionHandler;

public class Blockchain {

	private ClientBase clientBase;

	public Blockchain(ClientBase clientBase) {
		clientBase.appendGlobalHandler("blockchain.fetch_last_height", new FetchLastHeightHandler());
		clientBase.appendGlobalHandler("blockchain.fetch_transaction", new FetchTransactionHandler());
		clientBase.appendGlobalHandler("blockchain.fetch_block_header", new FetchBlockHeaderHandler());
		this.clientBase = clientBase;
	}

	public Future<Object> fetchTransaction(byte[] txHash) {
		ArrayUtils.reverse(txHash);
		Future<Object> f = clientBase.request("blockchain.fetch_transaction", txHash, null);
		return f;
	}
	
	public Future<Object> fetchTransaction(String txHash) {
		return this.fetchTransaction(Hex.decode(txHash));
	}
	
	public Future<Object> fetchLastHeight(){
		Future<Object> f = clientBase.request("blockchain.fetch_last_height", new byte[]{}, null);
		return f;
	}
	
	public Future<Object> fetchBlockHeader(long height){
		byte[] bytes = new byte[4];
		EndianUtils.writeSwappedInteger(bytes, 0, (int)height);
		Future<Object> f = clientBase.request("blockchain.fetch_block_header", bytes, null);
		return f;
	}

	public Future<Object> fetchBlockHeader(byte[] blockHash){
		assert blockHash != null && blockHash.length == 32;
		byte[] hash = ArrayUtils.clone(blockHash);
		ArrayUtils.reverse(hash);
		Future<Object> f = clientBase.request("blockchain.fetch_block_header", hash, null);
		return f;
	}
	
}
