/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package com.bdx.bwallet.tools.ui;

import com.bdx.bwallet.protobuf.BWalletMessage;
import com.bdx.bwallet.tools.controllers.MainController;
import com.bdx.bwallet.tools.core.events.HardwareWalletEvent;
import com.bdx.bwallet.tools.core.events.HardwareWalletEvents;
import com.bdx.bwallet.tools.core.events.MessageEvent;
import com.bdx.bwallet.tools.core.events.MessageEventType;
import com.bdx.bwallet.tools.core.events.MessageEvents;
import com.bdx.bwallet.tools.core.utils.FailureMessageUtils;
import com.bdx.bwallet.tools.model.Device;
import com.bdx.bwallet.tools.ui.utils.PINEntryUtils;
import com.google.common.eventbus.Subscribe;
import java.awt.Toolkit;
import java.awt.datatransfer.Clipboard;
import java.awt.datatransfer.StringSelection;
import java.awt.event.WindowEvent;
import java.awt.event.WindowListener;
import java.util.ArrayList;
import java.util.List;
import java.util.ResourceBundle;
import javax.swing.JOptionPane;
import javax.swing.event.DocumentEvent;
import javax.swing.event.DocumentListener;
import org.apache.commons.lang3.StringUtils;
import org.bitcoinj.crypto.ChildNumber;
import org.hid4java.HidDevice;

/**
 *
 * @author Administrator
 */
public class GetPublicKeyDialog extends javax.swing.JDialog implements WindowListener {

    private static final int HARDENED_BIT = 0x80000000;

    private ResourceBundle bundle;

    private MainController mainController;

    private Device device;

    private List<ChildNumber> childNumbers = null;

    /**
     * Creates new form GetPublicKeyDialog
     */
    public GetPublicKeyDialog(java.awt.Frame parent, boolean modal, ResourceBundle bundle, MainController mainController, Device device) {
        super(parent, modal);
        initComponents();

        this.mainController = mainController;
        this.device = device;

        this.addWindowListener(this);

        pathTextField.getDocument().addDocumentListener(new DocumentListener() {
            @Override
            public void changedUpdate(DocumentEvent e) {
                update();
            }

            @Override
            public void removeUpdate(DocumentEvent e) {
                update();
            }

            @Override
            public void insertUpdate(DocumentEvent e) {
                update();
            }

            public void update() {
                contentTextArea.setText("");
                addressTextField.setText("");
            }
        });

        this.bundle = bundle;
        applyResourceBundle();
    }

    public void applyResourceBundle() {
        setTitle(bundle.getString("GetPublicKeyDialog.title")); 
        copyPublicKeyButton.setText(bundle.getString("GetPublicKeyDialog.copyPublicKeyButton.text")); 
        closeButton.setText(bundle.getString("GetPublicKeyDialog.closeButton.text")); 
        pathLabel.setText(bundle.getString("GetPublicKeyDialog.pathLabel.text")); 
        getButton.setText(bundle.getString("GetPublicKeyDialog.getButton.text")); 
        egLabel.setText(bundle.getString("GetPublicKeyDialog.egLabel.text")); 
        publicKeyLabel.setText(bundle.getString("GetPublicKeyDialog.publicKeyLabel.text")); 
        addressLabel.setText(bundle.getString("GetPublicKeyDialog.addressLabel.text")); 
        copyAddressButton.setText(bundle.getString("GetPublicKeyDialog.copyAddressButton.text")); 
    }

    /**
     * This method is called from within the constructor to initialize the form.
     * WARNING: Do NOT modify this code. The content of this method is always
     * regenerated by the Form Editor.
     */
    @SuppressWarnings("unchecked")
    // <editor-fold defaultstate="collapsed" desc="Generated Code">//GEN-BEGIN:initComponents
    private void initComponents() {

        copyPublicKeyButton = new javax.swing.JButton();
        jScrollPane1 = new javax.swing.JScrollPane();
        contentTextArea = new javax.swing.JTextArea();
        closeButton = new javax.swing.JButton();
        pathLabel = new javax.swing.JLabel();
        pathTextField = new javax.swing.JTextField();
        getButton = new javax.swing.JButton();
        egLabel = new javax.swing.JLabel();
        addressTextField = new javax.swing.JTextField();
        publicKeyLabel = new javax.swing.JLabel();
        addressLabel = new javax.swing.JLabel();
        copyAddressButton = new javax.swing.JButton();

        setDefaultCloseOperation(javax.swing.WindowConstants.DISPOSE_ON_CLOSE);
        setTitle("Get Public Key");
        setResizable(false);

        copyPublicKeyButton.setText("Copy");
        copyPublicKeyButton.addActionListener(new java.awt.event.ActionListener() {
            public void actionPerformed(java.awt.event.ActionEvent evt) {
                copyPublicKeyButtonActionPerformed(evt);
            }
        });

        contentTextArea.setEditable(false);
        contentTextArea.setColumns(20);
        contentTextArea.setLineWrap(true);
        contentTextArea.setRows(5);
        jScrollPane1.setViewportView(contentTextArea);

        closeButton.setText("Close");
        closeButton.addActionListener(new java.awt.event.ActionListener() {
            public void actionPerformed(java.awt.event.ActionEvent evt) {
                closeButtonActionPerformed(evt);
            }
        });

        pathLabel.setText("BIP32 Path");

        pathTextField.addActionListener(new java.awt.event.ActionListener() {
            public void actionPerformed(java.awt.event.ActionEvent evt) {
                pathTextFieldActionPerformed(evt);
            }
        });

        getButton.setText("Get");
        getButton.addActionListener(new java.awt.event.ActionListener() {
            public void actionPerformed(java.awt.event.ActionEvent evt) {
                getButtonActionPerformed(evt);
            }
        });

        egLabel.setText("e.g. m/44'/0'/0'");

        addressTextField.setEditable(false);

        publicKeyLabel.setText("Public Key");

        addressLabel.setText("Address");

        copyAddressButton.setText("Copy");
        copyAddressButton.addActionListener(new java.awt.event.ActionListener() {
            public void actionPerformed(java.awt.event.ActionEvent evt) {
                copyAddressButtonActionPerformed(evt);
            }
        });

        javax.swing.GroupLayout layout = new javax.swing.GroupLayout(getContentPane());
        getContentPane().setLayout(layout);
        layout.setHorizontalGroup(
            layout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
            .addGroup(layout.createSequentialGroup()
                .addGroup(layout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
                    .addGroup(layout.createSequentialGroup()
                        .addGap(55, 55, 55)
                        .addGroup(layout.createParallelGroup(javax.swing.GroupLayout.Alignment.TRAILING, false)
                            .addComponent(jScrollPane1, javax.swing.GroupLayout.Alignment.LEADING)
                            .addComponent(addressTextField, javax.swing.GroupLayout.Alignment.LEADING)
                            .addGroup(javax.swing.GroupLayout.Alignment.LEADING, layout.createSequentialGroup()
                                .addGroup(layout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
                                    .addComponent(publicKeyLabel, javax.swing.GroupLayout.Alignment.TRAILING, javax.swing.GroupLayout.PREFERRED_SIZE, 60, javax.swing.GroupLayout.PREFERRED_SIZE)
                                    .addComponent(pathLabel))
                                .addGroup(layout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
                                    .addGroup(layout.createSequentialGroup()
                                        .addGap(36, 36, 36)
                                        .addComponent(pathTextField, javax.swing.GroupLayout.PREFERRED_SIZE, 243, javax.swing.GroupLayout.PREFERRED_SIZE)
                                        .addPreferredGap(javax.swing.LayoutStyle.ComponentPlacement.UNRELATED)
                                        .addComponent(egLabel)
                                        .addPreferredGap(javax.swing.LayoutStyle.ComponentPlacement.UNRELATED)
                                        .addComponent(getButton))
                                    .addGroup(layout.createSequentialGroup()
                                        .addPreferredGap(javax.swing.LayoutStyle.ComponentPlacement.UNRELATED)
                                        .addComponent(copyPublicKeyButton))))
                            .addGroup(javax.swing.GroupLayout.Alignment.LEADING, layout.createSequentialGroup()
                                .addComponent(addressLabel, javax.swing.GroupLayout.PREFERRED_SIZE, 60, javax.swing.GroupLayout.PREFERRED_SIZE)
                                .addPreferredGap(javax.swing.LayoutStyle.ComponentPlacement.UNRELATED)
                                .addComponent(copyAddressButton))))
                    .addGroup(layout.createSequentialGroup()
                        .addGap(252, 252, 252)
                        .addComponent(closeButton, javax.swing.GroupLayout.PREFERRED_SIZE, 80, javax.swing.GroupLayout.PREFERRED_SIZE)))
                .addContainerGap(37, Short.MAX_VALUE))
        );
        layout.setVerticalGroup(
            layout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
            .addGroup(javax.swing.GroupLayout.Alignment.TRAILING, layout.createSequentialGroup()
                .addGap(21, 21, 21)
                .addGroup(layout.createParallelGroup(javax.swing.GroupLayout.Alignment.BASELINE)
                    .addComponent(pathLabel)
                    .addComponent(pathTextField, javax.swing.GroupLayout.PREFERRED_SIZE, javax.swing.GroupLayout.DEFAULT_SIZE, javax.swing.GroupLayout.PREFERRED_SIZE)
                    .addComponent(getButton)
                    .addComponent(egLabel))
                .addPreferredGap(javax.swing.LayoutStyle.ComponentPlacement.UNRELATED)
                .addGroup(layout.createParallelGroup(javax.swing.GroupLayout.Alignment.BASELINE)
                    .addComponent(publicKeyLabel)
                    .addComponent(copyPublicKeyButton))
                .addGap(5, 5, 5)
                .addComponent(jScrollPane1, javax.swing.GroupLayout.PREFERRED_SIZE, 65, javax.swing.GroupLayout.PREFERRED_SIZE)
                .addPreferredGap(javax.swing.LayoutStyle.ComponentPlacement.RELATED, javax.swing.GroupLayout.DEFAULT_SIZE, Short.MAX_VALUE)
                .addGroup(layout.createParallelGroup(javax.swing.GroupLayout.Alignment.BASELINE)
                    .addComponent(addressLabel)
                    .addComponent(copyAddressButton))
                .addPreferredGap(javax.swing.LayoutStyle.ComponentPlacement.UNRELATED)
                .addComponent(addressTextField, javax.swing.GroupLayout.PREFERRED_SIZE, javax.swing.GroupLayout.DEFAULT_SIZE, javax.swing.GroupLayout.PREFERRED_SIZE)
                .addPreferredGap(javax.swing.LayoutStyle.ComponentPlacement.RELATED)
                .addComponent(closeButton)
                .addGap(14, 14, 14))
        );

        pack();
    }// </editor-fold>//GEN-END:initComponents

    private void pathTextFieldActionPerformed(java.awt.event.ActionEvent evt) {//GEN-FIRST:event_pathTextFieldActionPerformed
        // TODO add your handling code here:
    }//GEN-LAST:event_pathTextFieldActionPerformed

    private void getButtonActionPerformed(java.awt.event.ActionEvent evt) {//GEN-FIRST:event_getButtonActionPerformed
        if (device != null) {
            String path = pathTextField.getText();
            if (StringUtils.isBlank(path)) {
                JOptionPane.showMessageDialog(this, bundle.getString("GetPublicKeyDialog.MessageDialog.emptyPath"));
            } else if (!path.startsWith("m")) {
                JOptionPane.showMessageDialog(this, bundle.getString("GetPublicKeyDialog.MessageDialog.pathMustStartWithM"));
            } else {
                try {
                    List<ChildNumber> childNumbers = this.pathToChildNumbers(path);
                    mainController.getDeterministicHierarchy(device, childNumbers);
                    this.childNumbers = childNumbers;
                } catch (IllegalArgumentException e) {
                    JOptionPane.showMessageDialog(this, bundle.getString("GetPublicKeyDialog.MessageDialog.invalidPath"));
                }
            }
        } else {
            JOptionPane.showMessageDialog(this, bundle.getString("MessageDialog.deviceDetached"));
        }
    }//GEN-LAST:event_getButtonActionPerformed

    private void closeButtonActionPerformed(java.awt.event.ActionEvent evt) {//GEN-FIRST:event_closeButtonActionPerformed
        this.dispose();
    }//GEN-LAST:event_closeButtonActionPerformed

    private void copyPublicKeyButtonActionPerformed(java.awt.event.ActionEvent evt) {//GEN-FIRST:event_copyPublicKeyButtonActionPerformed
        String text = contentTextArea.getText();
        StringSelection selection = new StringSelection(text);
        Clipboard clipboard = Toolkit.getDefaultToolkit().getSystemClipboard();
        clipboard.setContents(selection, selection);
    }//GEN-LAST:event_copyPublicKeyButtonActionPerformed

    private void copyAddressButtonActionPerformed(java.awt.event.ActionEvent evt) {//GEN-FIRST:event_copyAddressButtonActionPerformed
        String text = addressTextField.getText();
        StringSelection selection = new StringSelection(text);
        Clipboard clipboard = Toolkit.getDefaultToolkit().getSystemClipboard();
        clipboard.setContents(selection, selection);
    }//GEN-LAST:event_copyAddressButtonActionPerformed

    @Subscribe
    public void onHardwareWalletEvent(HardwareWalletEvent event) {
        System.out.println(event.getEventType());
        switch (event.getEventType()) {
            case SHOW_PIN_ENTRY:
                PINEntryDialog pinEntryDialog = PINEntryUtils.createDialog(this, bundle, event.getMessage());
                pinEntryDialog.setVisible(true);
                if (pinEntryDialog.isCancel()) {
                    mainController.cancel();
                } else {
                    String pin = pinEntryDialog.getPin();
                    mainController.providePin(pin);
                }
                break;
            case DETERMINISTIC_HIERARCHY:
                BWalletMessage.PublicKey publicKey = (BWalletMessage.PublicKey) event.getMessage().get();
                contentTextArea.setText(publicKey.getXpub());
                if (device != null && childNumbers != null) {
                    mainController.getAddress(device, childNumbers, false);
                }
                break;
            case ADDRESS:
                BWalletMessage.Address address = (BWalletMessage.Address) event.getMessage().get();
                addressTextField.setText(address.getAddress());
                break;
            case SHOW_PASSPHRASE_ENTRY:
                PassphraseEntryDialog passphraseEntryDialog = new PassphraseEntryDialog(this, true, bundle);
                passphraseEntryDialog.setLocationRelativeTo(null);
                passphraseEntryDialog.setVisible(true);
                if (passphraseEntryDialog.isCancel()) {
                    mainController.cancel();
                } else {
                    String passphrase = passphraseEntryDialog.getPassphrase();
                    mainController.providePassphrase(passphrase);
                }
                break;
            case SHOW_OPERATION_FAILED:
                JOptionPane.showMessageDialog(this, FailureMessageUtils.extract(event.getMessage()));
                break;
            default:
                break;
        }
    }

    @Subscribe
    public void onMessageEvent(MessageEvent event) {
        if (event.getEventType() == MessageEventType.DEVICE_DETACHED) {
            HidDevice hidDevice = event.getDevice().get();
            if (hidDevice.getPath() != null && hidDevice.getPath().equals(device.getPath())) {
                device = null;
                JOptionPane.showMessageDialog(this, bundle.getString("MessageDialog.deviceDetached"));
            }
        } else if (event.getEventType() == MessageEventType.DEVICE_FAILED) {
            JOptionPane.showMessageDialog(this, bundle.getString("MessageDialog.deviceOpenFaild"));
        }
    }

    protected List<ChildNumber> pathToChildNumbers(String path) {
        List<ChildNumber> childNumbers = new ArrayList();
        String[] array = path.split("/");
        for (int i = 1; i < array.length; i++) {
            ChildNumber childNumber = null;
            String s = array[i];
            if (s.endsWith("'")) {
                int n = Integer.parseInt(s.substring(0, s.length() - 1));
                childNumber = new ChildNumber(n, true);
            } else {
                int n = Integer.parseInt(s);
                childNumber = new ChildNumber(n, false);
            }
            childNumbers.add(childNumber);
        }
        return childNumbers;
    }

    @Override
    public void windowOpened(WindowEvent e) {
        HardwareWalletEvents.subscribe(this);
        MessageEvents.subscribe(this);
    }

    @Override
    public void windowClosing(WindowEvent e) {
    }

    @Override
    public void windowClosed(WindowEvent e) {
        HardwareWalletEvents.unsubscribe(this);
        MessageEvents.unsubscribe(this);
    }

    @Override
    public void windowIconified(WindowEvent e) {
    }

    @Override
    public void windowDeiconified(WindowEvent e) {
    }

    @Override
    public void windowActivated(WindowEvent e) {
    }

    @Override
    public void windowDeactivated(WindowEvent e) {
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
            java.util.logging.Logger.getLogger(GetPublicKeyDialog.class.getName()).log(java.util.logging.Level.SEVERE, null, ex);
        } catch (InstantiationException ex) {
            java.util.logging.Logger.getLogger(GetPublicKeyDialog.class.getName()).log(java.util.logging.Level.SEVERE, null, ex);
        } catch (IllegalAccessException ex) {
            java.util.logging.Logger.getLogger(GetPublicKeyDialog.class.getName()).log(java.util.logging.Level.SEVERE, null, ex);
        } catch (javax.swing.UnsupportedLookAndFeelException ex) {
            java.util.logging.Logger.getLogger(GetPublicKeyDialog.class.getName()).log(java.util.logging.Level.SEVERE, null, ex);
        }
        //</editor-fold>

        /* Create and display the dialog */
        java.awt.EventQueue.invokeLater(new Runnable() {
            public void run() {
                GetPublicKeyDialog dialog = new GetPublicKeyDialog(new javax.swing.JFrame(), true, ResourceBundle.getBundle("com/bdx/bwallet/tools/ui/Bundle"), null, null);
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
    private javax.swing.JTextField addressTextField;
    private javax.swing.JButton closeButton;
    private javax.swing.JTextArea contentTextArea;
    private javax.swing.JButton copyAddressButton;
    private javax.swing.JButton copyPublicKeyButton;
    private javax.swing.JLabel egLabel;
    private javax.swing.JButton getButton;
    private javax.swing.JScrollPane jScrollPane1;
    private javax.swing.JLabel pathLabel;
    private javax.swing.JTextField pathTextField;
    private javax.swing.JLabel publicKeyLabel;
    // End of variables declaration//GEN-END:variables
}
