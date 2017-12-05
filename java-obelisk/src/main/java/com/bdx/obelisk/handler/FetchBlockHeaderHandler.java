package com.bdx.obelisk.handler;

import java.nio.ByteBuffer;

import org.apache.commons.io.EndianUtils;
import org.apache.commons.lang.ArrayUtils;

import com.bdx.obelisk.domain.BlockHeader;
import com.bdx.obelisk.exception.ObeliskException;
import com.google.common.util.concurrent.SettableFuture;

public class FetchBlockHeaderHandler implements ResponseHandler {

	@Override
	public void doHandle(byte[] data, SettableFuture<Object> future, Integer socketId) {
		ByteBuffer byteBuffer = ByteBuffer.wrap(data);
		byte[] bytes4 = new byte[4];
		byteBuffer.get(bytes4);
		int code = (int) EndianUtils.readSwappedUnsignedInteger(bytes4, 0);
		if (code == 0){
			byteBuffer.get(bytes4);
			long version = EndianUtils.readSwappedUnsignedInteger(bytes4, 0);
			byte[] previousBlockHash = new byte[32];
			byteBuffer.get(previousBlockHash);
			ArrayUtils.reverse(previousBlockHash);
			byte[] merkle = new byte[32];
			byteBuffer.get(merkle);
			ArrayUtils.reverse(merkle);
			byteBuffer.get(bytes4);
			long timestamp = EndianUtils.readSwappedUnsignedInteger(bytes4, 0);
			byteBuffer.get(bytes4);
			long bits = EndianUtils.readSwappedUnsignedInteger(bytes4, 0);
			byteBuffer.get(bytes4);
			long nonce = EndianUtils.readSwappedUnsignedInteger(bytes4, 0);
			BlockHeader header = new BlockHeader();
			header.setVersion(version);
			header.setPreviousBlockHash(previousBlockHash);
			header.setMerkle(merkle);
			header.setTimestamp(timestamp);
			header.setBits(bits);
			header.setNonce(nonce);
			future.set(header);
		} else {
			future.setException(new ObeliskException(code));
		}
	}

}
