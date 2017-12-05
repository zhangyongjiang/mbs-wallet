package com.bdx.obelisk.domain;

public class BlockHeader {

	private long version;
	private byte[] previousBlockHash;
	private byte[] merkle;
	private long timestamp;
	private long bits;
	private long nonce;

	public long getVersion() {
		return version;
	}

	public void setVersion(long version) {
		this.version = version;
	}

	public byte[] getPreviousBlockHash() {
		return previousBlockHash;
	}

	public void setPreviousBlockHash(byte[] previousBlockHash) {
		this.previousBlockHash = previousBlockHash;
	}

	public byte[] getMerkle() {
		return merkle;
	}

	public void setMerkle(byte[] merkle) {
		this.merkle = merkle;
	}

	public long getTimestamp() {
		return timestamp;
	}

	public void setTimestamp(long timestamp) {
		this.timestamp = timestamp;
	}

	public long getBits() {
		return bits;
	}

	public void setBits(long bits) {
		this.bits = bits;
	}

	public long getNonce() {
		return nonce;
	}

	public void setNonce(long nonce) {
		this.nonce = nonce;
	}

}
