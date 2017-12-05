package com.bdx.bwallet.applet;


public class MockHidDeviceInfo {
	private String path;

	private short vendorId;
	private short productId;
	private String serialNumber;

	private short releaseNumber;
	private String manufacturerString;

	private String productString;

	private short usagePage;
	private short usage;

	private int interfaceNumber;

	public String getPath() {
		return path;
	}

	public void setPath(String path) {
		this.path = path;
	}

	public short getVendorId() {
		return vendorId;
	}

	public void setVendorId(short vendorId) {
		this.vendorId = vendorId;
	}

	public short getProductId() {
		return productId;
	}

	public void setProductId(short productId) {
		this.productId = productId;
	}

	public String getSerialNumber() {
		return serialNumber;
	}

	public void setSerialNumber(String serialNumber) {
		this.serialNumber = serialNumber;
	}

	public short getReleaseNumber() {
		return releaseNumber;
	}

	public void setReleaseNumber(short releaseNumber) {
		this.releaseNumber = releaseNumber;
	}

	public String getManufacturerString() {
		return manufacturerString;
	}

	public void setManufacturerString(String manufacturerString) {
		this.manufacturerString = manufacturerString;
	}

	public String getProductString() {
		return productString;
	}

	public void setProductString(String productString) {
		this.productString = productString;
	}

	public short getUsagePage() {
		return usagePage;
	}

	public void setUsagePage(short usagePage) {
		this.usagePage = usagePage;
	}

	public short getUsage() {
		return usage;
	}

	public void setUsage(short usage) {
		this.usage = usage;
	}

	public int getInterfaceNumber() {
		return interfaceNumber;
	}

	public void setInterfaceNumber(int interfaceNumber) {
		this.interfaceNumber = interfaceNumber;
	}

	public String getId() {
		return "" + vendorId + "_" + productId + (serialNumber == null ? "" : "_" + serialNumber);
	}

	@Override
	public boolean equals(Object o) {
		if (this == o) {
			return true;
		}
		if (o == null || getClass() != o.getClass()) {
			return false;
		}

		MockHidDeviceInfo that = (MockHidDeviceInfo) o;

		if (productId != that.productId) {
			return false;
		}
		if (vendorId != that.vendorId) {
			return false;
		}
		if (serialNumber != null ? !serialNumber.equals(that.serialNumber) : that.serialNumber != null) {
			return false;
		}

		return true;
	}

	@Override
	public int hashCode() {
		int result = (int) vendorId;
		result = 31 * result + (int) productId;
		result = 31 * result + (serialNumber != null ? serialNumber.hashCode() : 0);
		return result;
	}

	@Override
	public String toString() {
		return "MockHidDeviceInfo{" + "path='" + path + '\'' + ", vendorId=" + Integer.toHexString(vendorId) + ", productId=" + Integer.toHexString(productId)
				+ ", serialNumber=" + serialNumber + ", releaseNumber=" + releaseNumber + ", manufacturerString=" + manufacturerString + ", productString="
				+ productString + ", usagePage=" + usagePage + ", usage=" + usage + ", interfaceNumber=" + interfaceNumber + '}';
	}

}
