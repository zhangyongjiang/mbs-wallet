package com.bdx.obelisk.handler;

import java.nio.ByteBuffer;

import org.apache.commons.io.EndianUtils;

import com.bdx.obelisk.exception.ObeliskException;
import com.google.common.util.concurrent.SettableFuture;

public class FetchLastHeightHandler implements ResponseHandler {

	public void doHandle(byte[] data, SettableFuture<Object> future, Integer socketId) {
		ByteBuffer byteBuffer = ByteBuffer.wrap(data);
		byte[] bytes4 = new byte[4];
		byteBuffer.get(bytes4);
		int code = (int) EndianUtils.readSwappedUnsignedInteger(bytes4, 0);
		if (code == 0){
			byte[] bytes = new byte[4];
			byteBuffer.get(bytes);
			long height = EndianUtils.readSwappedUnsignedInteger(bytes, 0);
			future.set(height);
		} else {
			future.setException(new ObeliskException(code));
		}
	}

}
