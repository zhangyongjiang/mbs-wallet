/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package com.bdx.bwallet.tools.ui;

import com.bdx.bwallet.tools.ui.utils.BIP44PathUtils;
import com.bdx.bwallet.tools.ui.utils.LabelUtils;
import com.bdx.bwallet.tools.ui.utils.QRCodes;
import com.google.common.base.Optional;
import java.awt.image.BufferedImage;
import java.util.ResourceBundle;
import javax.swing.JLabel;
import org.bitcoinj.crypto.DeterministicKey;
import org.bitcoinj.params.MainNetParams;

/**
 *
 * @author Administrator
 */
public class AccountDetailsEyeDialog extends javax.swing.JDialog {

    private ResourceBundle bundle;

    private String address;

    /**
     * Creates new form AddressDetailsDialog
     */
    public AccountDetailsEyeDialog(java.awt.Dialog parent, boolean modal, ResourceBundle bundle) {
        super(parent, modal);
        initComponents();
        this.bundle = bundle;
        applyResourceBundle();
    }

    public void applyResourceBundle() {
        setTitle(""); 
        titleLabel.setText(bundle.getString("AccountDetailsEyeDialog.titleLabel.text")); 
        messageLabel.setText(bundle.getString("AccountDetailsEyeDialog.messageLabel.text")); 
    }

    /**
     * This method is called from within the constructor to initialize the form.
     * WARNING: Do NOT modify this code. The content of this method is always
     * regenerated by the Form Editor.
     */
    @SuppressWarnings("unchecked")
    // <editor-fold defaultstate="collapsed" desc="Generated Code">//GEN-BEGIN:initComponents
    private void initComponents() {

        qrCodePanel = new javax.swing.JPanel();
        pathLabel = new javax.swing.JLabel();
        titleLabel = new javax.swing.JLabel();
        messageLabel = new javax.swing.JLabel();
        addressLabel = new javax.swing.JLabel();

        setDefaultCloseOperation(javax.swing.WindowConstants.DISPOSE_ON_CLOSE);
        setTitle("Address Details");
        setResizable(false);

        javax.swing.GroupLayout qrCodePanelLayout = new javax.swing.GroupLayout(qrCodePanel);
        qrCodePanel.setLayout(qrCodePanelLayout);
        qrCodePanelLayout.setHorizontalGroup(
            qrCodePanelLayout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
            .addGap(0, 180, Short.MAX_VALUE)
        );
        qrCodePanelLayout.setVerticalGroup(
            qrCodePanelLayout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
            .addGap(0, 180, Short.MAX_VALUE)
        );

        pathLabel.setText("m/44'/0'/0'/0/0");

        titleLabel.setText("Check address on BWallet display");

        messageLabel.setText("<html><p>If the address matches your BWallet display, <br/>you can be sure it is genuine.</p></html>");

        addressLabel.setText(" ");

        javax.swing.GroupLayout layout = new javax.swing.GroupLayout(getContentPane());
        getContentPane().setLayout(layout);
        layout.setHorizontalGroup(
            layout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
            .addGroup(layout.createSequentialGroup()
                .addGroup(layout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
                    .addGroup(layout.createSequentialGroup()
                        .addContainerGap()
                        .addGroup(layout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
                            .addComponent(titleLabel, javax.swing.GroupLayout.DEFAULT_SIZE, javax.swing.GroupLayout.DEFAULT_SIZE, Short.MAX_VALUE)
                            .addGroup(layout.createSequentialGroup()
                                .addComponent(messageLabel, javax.swing.GroupLayout.PREFERRED_SIZE, javax.swing.GroupLayout.DEFAULT_SIZE, javax.swing.GroupLayout.PREFERRED_SIZE)
                                .addGap(0, 0, Short.MAX_VALUE))))
                    .addGroup(layout.createSequentialGroup()
                        .addGap(46, 46, 46)
                        .addComponent(qrCodePanel, javax.swing.GroupLayout.PREFERRED_SIZE, javax.swing.GroupLayout.DEFAULT_SIZE, javax.swing.GroupLayout.PREFERRED_SIZE)
                        .addGap(0, 0, Short.MAX_VALUE))
                    .addGroup(layout.createSequentialGroup()
                        .addContainerGap()
                        .addComponent(addressLabel, javax.swing.GroupLayout.DEFAULT_SIZE, javax.swing.GroupLayout.DEFAULT_SIZE, Short.MAX_VALUE)))
                .addContainerGap())
            .addGroup(layout.createSequentialGroup()
                .addContainerGap()
                .addComponent(pathLabel, javax.swing.GroupLayout.PREFERRED_SIZE, 264, javax.swing.GroupLayout.PREFERRED_SIZE)
                .addContainerGap(javax.swing.GroupLayout.DEFAULT_SIZE, Short.MAX_VALUE))
        );
        layout.setVerticalGroup(
            layout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
            .addGroup(javax.swing.GroupLayout.Alignment.TRAILING, layout.createSequentialGroup()
                .addContainerGap(20, Short.MAX_VALUE)
                .addComponent(titleLabel)
                .addPreferredGap(javax.swing.LayoutStyle.ComponentPlacement.UNRELATED)
                .addComponent(messageLabel, javax.swing.GroupLayout.PREFERRED_SIZE, 41, javax.swing.GroupLayout.PREFERRED_SIZE)
                .addPreferredGap(javax.swing.LayoutStyle.ComponentPlacement.RELATED)
                .addComponent(pathLabel)
                .addPreferredGap(javax.swing.LayoutStyle.ComponentPlacement.UNRELATED)
                .addComponent(addressLabel)
                .addPreferredGap(javax.swing.LayoutStyle.ComponentPlacement.UNRELATED)
                .addComponent(qrCodePanel, javax.swing.GroupLayout.PREFERRED_SIZE, javax.swing.GroupLayout.DEFAULT_SIZE, javax.swing.GroupLayout.PREFERRED_SIZE)
                .addGap(18, 18, 18))
        );

        pack();
    }// </editor-fold>//GEN-END:initComponents

    public void init(DeterministicKey deterministicKey) {
        address = deterministicKey.toAddress(MainNetParams.get()).toString();

        String path = BIP44PathUtils.getAccountPath(deterministicKey);        
        pathLabel.setText(path);

        addressLabel.setText(address);
        
        Optional<BufferedImage> qrCodeImage = QRCodes.generateQRCode(address, 2);
        JLabel imageLabel = LabelUtils.newImageLabel(qrCodeImage);
        imageLabel.setSize(180, 180);
        qrCodePanel.removeAll();
        qrCodePanel.add(imageLabel);
        qrCodePanel.repaint();
    }

    /**
     * @param args the command line arguments
     */
    public static void main(String args[]) {
        /* Set the Nimbus look and feel */
        //<editor-fold defaultstate="collapsed" desc=" Look and feel setting code (optional) ">
        /* If Nimbus (introduced in Java SE 6) is not available, stay with the default look and feel.
         * For details see http://download.oracle.com/javase/tutorial/uiswing/lookandfeel/plaf.html 
         */
        try {
            for (javax.swing.UIManager.LookAndFeelInfo info : javax.swing.UIManager.getInstalledLookAndFeels()) {
                if ("Nimbus".equals(info.getName())) {
                    javax.swing.UIManager.setLookAndFeel(info.getClassName());
                    break;
                }
            }
        } catch (ClassNotFoundException ex) {
            java.util.logging.Logger.getLogger(AccountDetailsEyeDialog.class.getName()).log(java.util.logging.Level.SEVERE, null, ex);
        } catch (InstantiationException ex) {
            java.util.logging.Logger.getLogger(AccountDetailsEyeDialog.class.getName()).log(java.util.logging.Level.SEVERE, null, ex);
        } catch (IllegalAccessException ex) {
            java.util.logging.Logger.getLogger(AccountDetailsEyeDialog.class.getName()).log(java.util.logging.Level.SEVERE, null, ex);
        } catch (javax.swing.UnsupportedLookAndFeelException ex) {
            java.util.logging.Logger.getLogger(AccountDetailsEyeDialog.class.getName()).log(java.util.logging.Level.SEVERE, null, ex);
        }
        //</editor-fold>
        //</editor-fold>

        /* Create and display the dialog */
        java.awt.EventQueue.invokeLater(new Runnable() {
            public void run() {
                AccountDetailsEyeDialog dialog = new AccountDetailsEyeDialog(new javax.swing.JDialog(), true, ResourceBundle.getBundle("com/bdx/bwallet/tools/ui/Bundle"));
                dialog.addWindowListener(new java.awt.event.WindowAdapter() {
                    @Override
                    public void windowClosing(java.awt.event.WindowEvent e) {
                        System.exit(0);
                    }
                });
                dialog.setVisible(true);
            }
        });
    }

    // Variables declaration - do not modify//GEN-BEGIN:variables
    private javax.swing.JLabel addressLabel;
    private javax.swing.JLabel messageLabel;
    private javax.swing.JLabel pathLabel;
    private javax.swing.JPanel qrCodePanel;
    private javax.swing.JLabel titleLabel;
    // End of variables declaration//GEN-END:variables
}
