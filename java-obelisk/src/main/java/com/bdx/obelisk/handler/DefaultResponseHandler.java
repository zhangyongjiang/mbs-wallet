package com.bdx.obelisk.handler;

import com.google.common.util.concurrent.SettableFuture;

public abstract class DefaultResponseHandler implements ResponseHandler {

	public abstract Object doHandle(byte[] data);
	
	public void doHandle(byte[] data, SettableFuture<Object> future, Integer socketId) {
		try {
			Object o = this.doHandle(data);
			future.set(o);
		} catch (Exception e){
			future.setException(e);
		}
	}

}
