package com.bdx.obelisk.handler;

import java.nio.ByteBuffer;

import org.apache.commons.io.EndianUtils;

import com.bdx.obelisk.exception.ObeliskException;
import com.google.common.util.concurrent.SettableFuture;

public class BroadcastHandler implements ResponseHandler {

	public void doHandle(byte[] data, SettableFuture<Object> future, Integer socketId) {
		ByteBuffer byteBuffer = ByteBuffer.wrap(data);
		byte[] bytes4 = new byte[4];
		byteBuffer.get(bytes4);
		int code = (int) EndianUtils.readSwappedUnsignedInteger(bytes4, 0);
		if (code == 0){
			future.set(true);
		} else {
			future.setException(new ObeliskException(code));
		}
	}

}
