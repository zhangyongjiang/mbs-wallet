package com.bdx.obelisk.handler;

import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.List;

import org.apache.commons.io.EndianUtils;
import org.apache.commons.lang.ArrayUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.bdx.obelisk.domain.History;
import com.bdx.obelisk.exception.ObeliskException;
import com.google.common.util.concurrent.SettableFuture;

public class FetchHistoryHandler implements ResponseHandler {

	final static Logger LOG = LoggerFactory.getLogger(FetchHistoryHandler.class);
	
	public void doHandle(byte[] data, SettableFuture<Object> future, Integer socketId) {
		int rowSize = 36 + 4 + 8 + 36 + 4;
		if ((data.length - 4) % rowSize != 0){
			LOG.error("Malformed response for *.fetch_history");
	        return;
	    }
		
		byte[] bytes4 = new byte[4];
		byte[] bytes8 = new byte[8];
		
		ByteBuffer byteBuffer = ByteBuffer.wrap(data);
		byteBuffer.get(bytes4);
		int code = (int) EndianUtils.readSwappedUnsignedInteger(bytes4, 0);
		if (code == 0){
			int numberRows = (data.length - 4) / rowSize;
			List<History> histories = new ArrayList<History>();
			for (int i = 0; i < numberRows; i++){
				History history = new History();
				History.Output output = new History.Output();
				History.Spend spend = new History.Spend();
				history.setOutput(output);
				history.setSpend(spend);
				
				byte[] outputHash = new byte[32];
				byte[] spendHash = new byte[32];
				
				byteBuffer.get(outputHash);
				ArrayUtils.reverse(outputHash);
				history.getOutput().setHash(outputHash);
				
				byteBuffer.get(bytes4);
				history.getOutput().setIndex(EndianUtils.readSwappedUnsignedInteger(bytes4, 0));
				byteBuffer.get(bytes4);
				history.setOutputHeight(EndianUtils.readSwappedUnsignedInteger(bytes4, 0));
				byteBuffer.get(bytes8);
				history.setValue(EndianUtils.readSwappedLong(bytes8, 0));
				byteBuffer.get(spendHash);
				ArrayUtils.reverse(spendHash);
				history.getSpend().setHash(spendHash);
				byteBuffer.get(bytes4);
				history.getSpend().setIndex(EndianUtils.readSwappedUnsignedInteger(bytes4, 0));
				byteBuffer.get(bytes4);
				history.setSpendHeight(EndianUtils.readSwappedUnsignedInteger(bytes4, 0));
				
				histories.add(history);
			}
			future.set(histories);
		} else {
			future.setException(new ObeliskException(code));
		}
	}

}
