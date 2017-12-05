package com.bdx.obelisk.handler;

import java.nio.ByteBuffer;

import org.apache.commons.io.EndianUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.bdx.obelisk.exception.ObeliskException;
import com.google.common.util.concurrent.SettableFuture;

public class RenewHandler implements ResponseHandler {

	final static Logger LOG = LoggerFactory.getLogger(RenewHandler.class);
	
	@Override
	public void doHandle(byte[] data, SettableFuture<Object> future,
			Integer socketId) {
		ByteBuffer byteBuffer = ByteBuffer.wrap(data);
		byte[] bytes4 = new byte[4];
		byteBuffer.get(bytes4);
		int code = (int) EndianUtils.readSwappedUnsignedInteger(bytes4, 0);
		if (code == 0) {
			future.set(true);
		} else {
			LOG.error("renew error - " + code);
			future.setException(new ObeliskException(code));
		}
	}

}
