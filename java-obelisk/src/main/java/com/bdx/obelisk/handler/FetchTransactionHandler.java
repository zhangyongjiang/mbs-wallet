package com.bdx.obelisk.handler;

import java.nio.ByteBuffer;

import org.apache.commons.io.EndianUtils;

import com.bdx.obelisk.exception.ObeliskException;
import org.bitcoinj.core.Transaction;
import org.bitcoinj.params.MainNetParams;
import com.google.common.util.concurrent.SettableFuture;

public class FetchTransactionHandler implements ResponseHandler {

	public void doHandle(byte[] data, SettableFuture<Object> future, Integer socketId) {
		ByteBuffer byteBuffer = ByteBuffer.wrap(data);
		byte[] bytes4 = new byte[4];
		byteBuffer.get(bytes4);
		int code = (int) EndianUtils.readSwappedUnsignedInteger(bytes4, 0);
		if (code == 0){
			byte[] txBytes = new byte[data.length - 4];
			byteBuffer.get(txBytes);
			Transaction tx = new Transaction(MainNetParams.get(), txBytes);
			future.set(tx);
		} else {
			future.setException(new ObeliskException(code));
		}
	}

}
