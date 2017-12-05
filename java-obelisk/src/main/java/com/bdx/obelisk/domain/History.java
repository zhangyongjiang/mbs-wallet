package com.bdx.obelisk.domain;

public class History {

	private long value;
	private long outputHeight;
	private long spendHeight;
	private Output output;
	private Spend spend;

	public Output getOutput() {
		return output;
	}

	public long getValue() {
		return value;
	}

	public void setValue(long value) {
		this.value = value;
	}

	public long getOutputHeight() {
		return outputHeight;
	}

	public void setOutputHeight(long outputHeight) {
		this.outputHeight = outputHeight;
	}

	public long getSpendHeight() {
		return spendHeight;
	}

	public void setSpendHeight(long spendHeight) {
		this.spendHeight = spendHeight;
	}

	public void setOutput(Output output) {
		this.output = output;
	}

	public Spend getSpend() {
		return spend;
	}

	public void setSpend(Spend spend) {
		this.spend = spend;
	}

	public static class Output {
		private byte[] hash;
		private long index;

		public Output(byte[] hash, int index) {
			this.hash = hash;
			this.index = index;
		}

		public Output() {
		}

		public byte[] getHash() {
			return hash;
		}

		public void setHash(byte[] hash) {
			this.hash = hash;
		}

		public long getIndex() {
			return index;
		}

		public void setIndex(long index) {
			this.index = index;
		}
	}

	public static class Spend {
		private byte[] hash;
		private long index;

		public Spend(byte[] hash, long index) {
			this.hash = hash;
			this.index = index;
		}

		public Spend() {
		}
		
		public byte[] getHash() {
			return hash;
		}

		public void setHash(byte[] hash) {
			this.hash = hash;
		}

		public long getIndex() {
			return index;
		}

		public void setIndex(long index) {
			this.index = index;
		}
	}
}

