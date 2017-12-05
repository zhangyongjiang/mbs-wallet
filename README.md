Copied from https://github.com/BWallet

硬件
BWallet内含CPU处理器、独立存储空间，正面有一个LED显示屏和两个按钮，内部不含电池，USB接口负责硬件的供电和与外部设备的通信。

CPU处理器：主要负责交易的签名计算、产生随机数、维护硬件钱包系统逻辑；

独立存储空间：保存钱包私钥种子（或部分私钥种子）、硬件钱包引导程序、硬件钱包固件程序及用户设置参数；

LED显示屏：显示BWallet运行细节，以便人工确认；

按钮：重要操作时必须人工通过按钮来确认。

 

基本原理
初始化钱包：即随机产生钱包私钥。是由BWallet设备内部的CPU独立完成的，CPU自带硬件随机发生器且随机数经过验证是安全可靠的。

备份钱包：初始化钱包时会在设备LED显示屏上根据BIP39规则显示种子单词，用户分别有一次记录和校对的机会。整个过程仅在硬件钱包上显示，连接BWallet的电脑或手机并无法获取。（符合冷钱包规则）

恢复钱包：用户只要拥有种子单词则掌握私钥的所有权。恢复过程设备显示种子序号，连接BWallet的电脑或手机并不知道种子的顺序。24个单词的排序可能为620448401733239439360000，另外用户还可以启用种子密码来进一步提高安全性。

发送比特币：1）浏览器JavaScript脚本，根据该钱包的区块链数据构建出未签名的交易对象，通过USB向BWallet提出交易签名申请；2）BWallet设备收到请求后要求用户输入PIN码。具体流程：设备LED显示乱序的1-9的九宫格，用户根据九宫格内容在网页上点击输入。整个过程中连接BWallet的电脑无法获知PIN码；3）BWallet确认PIN码后，在LED显示即将签名的具体交易信息（包括收款地址，发送数量），要求用户通过按钮确认。这一步可以很大程度提高钱包的安全性，可以有效防止病毒和黑客通过伪装手段来欺骗用户。4）用户通过按钮手动确认之后，BWallet设备通过自有的CPU对交易对象进行签名，再由USB将签名好的交易对象输出到连接BWallet电脑或手机进行广播。（符合冷钱包规则）

接收比特币：连接BWallet或已经缓存BWallet账户公钥信息的电脑都可以显示该账户下的收款地址。只需要将您的收款地址发给对方即可。根据BIP32和BIP44规则，一个账户有2的32次方个收款地址，您可做到一个收款地址对应该一个应收款。

