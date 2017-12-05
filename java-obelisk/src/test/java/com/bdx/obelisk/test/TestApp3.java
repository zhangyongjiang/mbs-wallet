package com.bdx.obelisk.test;

import org.apache.commons.codec.DecoderException;
import org.bitcoinj.core.AddressFormatException;

import com.bdx.obelisk.domain.History;
//import org.apache.commons.codec.binary.Hex;
//import org.apache.commons.codec.binary.Hex;

public class TestApp3 {

	public static void main(String[] args) throws AddressFormatException, DecoderException {
		//tcp://192.168.8.105:9091
		//tcp://104.36.80.21:9091
		
//		long s = System.currentTimeMillis();
//		for (int i = 0; i < 100000; i++){
//			System.out.println("xx");
//		}
//		long l = System.currentTimeMillis() - s;
//		System.out.println(l);
		
		/*
		final Map<String, String> map = new ConcurrentHashMap<String, String>();
		map.put("a", "a");
		map.put("b", "b");
		map.put("c", "c");
		map.put("d", "d");
		
		Iterator<String> iterator = map.keySet().iterator();
		map.remove("a");
		map.remove("b");
		map.remove("c");
		map.remove("d");
		while (iterator.hasNext()){
			String e = iterator.next();
			if (e == null)
				System.out.println("null");
			else
				System.out.println(e);
		}
		*/
		
		/*
		Thread a = new Thread(new Runnable(){

			public void run() {
				Iterator<String> iterator = map.keySet().iterator();
				while (iterator.hasNext()){
					try {
						Thread.sleep(1000);
					} catch (InterruptedException e) {
						e.printStackTrace();
					}
					System.out.println("-----------");
					String e = iterator.next();
					System.out.println(e);
				}
			}
			
		});
		
		Thread b = new Thread(new Runnable(){

			public void run() {
				try {
					Thread.sleep(1500);
				} catch (InterruptedException e) {
					e.printStackTrace();
				}
				System.out.println("???????????");
				map.remove("a");
				map.remove("b");
				map.remove("c");
				map.remove("d");
			}
			
		});
		b.start();
		a.start();
		*/
		
		/*
		Map<Object, String> map = new ConcurrentHashMap<Object, String>();
		Object o1 = new Object();
		Object o2 = new Object();
		map.put(o1, "1");
		map.put(o2, "2");
		System.out.println(map.size());
		System.out.println(map.get(o1));
		System.out.println(map.get(o2));
		*/
		
		/*
		class R {
			int i = 0;
		}
		
		class O {
			R r = new R();
			public void add(){
				System.out.println(++r.i);
			}
		}
		
		final O o = new O();
		
		class T implements Runnable {
			public void run() {
				try {
					Thread.sleep(10);
				} catch (InterruptedException e) {
					e.printStackTrace();
				}
				for (int i = 0; i < 100; i++){
					o.add();
				}
			}
		}
		
		class T2 implements Runnable {
			public void run() {
				o.r = new R();
				for (int i = 0; i < 100; i++){
					o.add();
				}
			}
		}
		
		ExecutorService executor = Executors.newFixedThreadPool(10);
		
		T t = new T();
		T2 t2 = new T2();
		executor.submit(t);
		executor.submit(t2);
		*/
		
		History[] a = new History[5];
		for (int i = 0; i < a.length; i++) {
			a[i] = new History();
			a[i].setOutputHeight(1111l);
		}
		
		History[] b = new History[5];
		System.arraycopy(a, 0, b, 0, a.length);
		
		for (int i = 0; i < b.length; i++) {
			System.out.println(b[i].getOutputHeight());
		}
		
		for (int i = 0; i < b.length; i++) {
			b[i].setOutputHeight(2222l);
		}
		
		for (int i = 0; i < a.length; i++) {
			System.out.println(a[i].getOutputHeight());
		}
		
		
	}
	
	
	

}
