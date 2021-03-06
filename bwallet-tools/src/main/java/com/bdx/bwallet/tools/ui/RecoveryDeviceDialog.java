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
import com.bdx.bwallet.tools.model.Language;
import com.bdx.bwallet.tools.ui.utils.PINEntryUtils;
import com.google.common.eventbus.Subscribe;
import java.awt.event.WindowEvent;
import java.awt.event.WindowListener;
import java.util.ResourceBundle;
import javax.swing.DefaultComboBoxModel;
import javax.swing.JOptionPane;
import javax.swing.border.TitledBorder;
import org.hid4java.HidDevice;

/**
 *
 * @author Administrator
 */
public class RecoveryDeviceDialog extends javax.swing.JDialog implements WindowListener {

    private ResourceBundle bundle;
    
    private MainController mainController;

    private Device device;

    private WordEntryDialog wordEntryDialog;
    
    /**
     * Creates new form RecoveryDeviceDialog
     */
    public RecoveryDeviceDialog(java.awt.Frame parent, boolean modal, ResourceBundle bundle, MainController mainController, Device device) {
        super(parent, modal);
        initComponents();

        DefaultComboBoxModel languageComboBoxModel = (DefaultComboBoxModel) languageComboBox.getModel();
        languageComboBoxModel.removeAllElements();
        languageComboBoxModel.addElement(new Language("english", "English"));
        languageComboBoxModel.addElement(new Language("chinese", "中文"));

        wordEntryDialog = new WordEntryDialog(this, true, bundle, mainController);
        wordEntryDialog.setLocationRelativeTo(null);
        
        this.mainController = mainController;
        this.device = device;

        this.addWindowListener(this);
        
        this.bundle = bundle;
        applyResourceBundle();
    }

    public void applyResourceBundle() {
        setTitle(bundle.getString("RecoveryDeviceDialog.title")); 
        
        ((TitledBorder)basicPanel.getBorder()).setTitle(bundle.getString("RecoveryDeviceDialog.basicPanel.border.title"));
        ((TitledBorder)advancedPanel.getBorder()).setTitle(bundle.getString("RecoveryDeviceDialog.advancedPanel.border.title"));
        
        labelLabel.setText(bundle.getString("RecoveryDeviceDialog.labelLabel.text")); 
        languageLabel.setText(bundle.getString("RecoveryDeviceDialog.languageLabel.text")); 
        labelTextField.setText(bundle.getString("RecoveryDeviceDialog.labelTextField.text")); 
        continueButton.setText(bundle.getString("RecoveryDeviceDialog.continueButton.text")); 
        lengthLabel.setText(bundle.getString("RecoveryDeviceDialog.lengthLabel.text")); 
        len12Label.setText(bundle.getString("RecoveryDeviceDialog.len12Label.text")); 
        len18Label.setText(bundle.getString("RecoveryDeviceDialog.len18Label.text")); 
        len24Label.setText(bundle.getString("RecoveryDeviceDialog.len24Label.text")); 
        pinLabel.setText(bundle.getString("RecoveryDeviceDialog.pinLabel.text")); 
        passphraseLabel.setText(bundle.getString("RecoveryDeviceDialog.passphraseLabel.text")); 
        pinCheckBox.setText(bundle.getString("RecoveryDeviceDialog.pinCheckBox.text")); 
        passphraseCheckBox.setText(bundle.getString("RecoveryDeviceDialog.passphraseCheckBox.text")); 
    }
    
    /**
     * This method is called from within the constructor to initialize the form.
     * WARNING: Do NOT modify this code. The content of this method is always
     * regenerated by the Form Editor.
     */
    @SuppressWarnings("unchecked")
    // <editor-fold defaultstate="collapsed" desc="Generated Code">//GEN-BEGIN:initComponents
    private void initComponents() {

        basicPanel = new javax.swing.JPanel();
        labelLabel = new javax.swing.JLabel();
        languageLabel = new javax.swing.JLabel();
        labelTextField = new javax.swing.JTextField();
        languageComboBox = new javax.swing.JComboBox();
        continueButton = new javax.swing.JButton();
        advancedPanel = new javax.swing.JPanel();
        lengthLabel = new javax.swing.JLabel();
        lengthSlider = new javax.swing.JSlider();
        len12Label = new javax.swing.JLabel();
        len18Label = new javax.swing.JLabel();
        len24Label = new javax.swing.JLabel();
        pinLabel = new javax.swing.JLabel();
        passphraseLabel = new javax.swing.JLabel();
        pinCheckBox = new javax.swing.JCheckBox();
        passphraseCheckBox = new javax.swing.JCheckBox();

        setDefaultCloseOperation(javax.swing.WindowConstants.DISPOSE_ON_CLOSE);
        setTitle("Recovery Device");
        setResizable(false);

        basicPanel.setBorder(javax.swing.BorderFactory.createTitledBorder(" Basic settings "));

        labelLabel.setText("Device label");

        languageLabel.setText("Device language");

        labelTextField.setText("My BWallet");

        languageComboBox.setModel(new javax.swing.DefaultComboBoxModel(new String[] { "English", "中文" }));
        languageComboBox.addActionListener(new java.awt.event.ActionListener() {
            public void actionPerformed(java.awt.event.ActionEvent evt) {
                languageComboBoxActionPerformed(evt);
            }
        });

        javax.swing.GroupLayout basicPanelLayout = new javax.swing.GroupLayout(basicPanel);
        basicPanel.setLayout(basicPanelLayout);
        basicPanelLayout.setHorizontalGroup(
            basicPanelLayout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
            .addGroup(basicPanelLayout.createSequentialGroup()
                .addContainerGap()
                .addGroup(basicPanelLayout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
                    .addComponent(languageComboBox, javax.swing.GroupLayout.Alignment.TRAILING, 0, javax.swing.GroupLayout.DEFAULT_SIZE, Short.MAX_VALUE)
                    .addComponent(languageLabel, javax.swing.GroupLayout.Alignment.TRAILING, javax.swing.GroupLayout.DEFAULT_SIZE, javax.swing.GroupLayout.DEFAULT_SIZE, Short.MAX_VALUE)
                    .addComponent(labelLabel, javax.swing.GroupLayout.Alignment.TRAILING, javax.swing.GroupLayout.DEFAULT_SIZE, 548, Short.MAX_VALUE)
                    .addComponent(labelTextField))
                .addContainerGap())
        );
        basicPanelLayout.setVerticalGroup(
            basicPanelLayout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
            .addGroup(basicPanelLayout.createSequentialGroup()
                .addContainerGap()
                .addComponent(labelLabel, javax.swing.GroupLayout.PREFERRED_SIZE, 40, javax.swing.GroupLayout.PREFERRED_SIZE)
                .addPreferredGap(javax.swing.LayoutStyle.ComponentPlacement.RELATED)
                .addComponent(labelTextField, javax.swing.GroupLayout.PREFERRED_SIZE, 40, javax.swing.GroupLayout.PREFERRED_SIZE)
                .addGap(18, 18, 18)
                .addComponent(languageLabel, javax.swing.GroupLayout.PREFERRED_SIZE, 40, javax.swing.GroupLayout.PREFERRED_SIZE)
                .addPreferredGap(javax.swing.LayoutStyle.ComponentPlacement.RELATED)
                .addComponent(languageComboBox, javax.swing.GroupLayout.PREFERRED_SIZE, 40, javax.swing.GroupLayout.PREFERRED_SIZE)
                .addContainerGap(33, Short.MAX_VALUE))
        );

        continueButton.setText("Continue");
        continueButton.addActionListener(new java.awt.event.ActionListener() {
            public void actionPerformed(java.awt.event.ActionEvent evt) {
                continueButtonActionPerformed(evt);
            }
        });

        advancedPanel.setBorder(javax.swing.BorderFactory.createTitledBorder(" Advanced settings "));

        lengthLabel.setText("Recovery seed length");

        lengthSlider.setMaximum(24);
        lengthSlider.setMinimum(12);
        lengthSlider.setMinorTickSpacing(6);
        lengthSlider.setPaintTicks(true);
        lengthSlider.setSnapToTicks(true);

        len12Label.setText("12 words");
        len12Label.setVerticalAlignment(javax.swing.SwingConstants.TOP);

        len18Label.setText("18 words");
        len18Label.setVerticalAlignment(javax.swing.SwingConstants.TOP);

        len24Label.setText("24 words");
        len24Label.setVerticalAlignment(javax.swing.SwingConstants.TOP);

        pinLabel.setText("PIN protection");

        passphraseLabel.setText("Additional passphrase encryption");

        pinCheckBox.setSelected(true);
        pinCheckBox.setText("Enable PIN protection");
        pinCheckBox.addActionListener(new java.awt.event.ActionListener() {
            public void actionPerformed(java.awt.event.ActionEvent evt) {
                pinCheckBoxActionPerformed(evt);
            }
        });

        passphraseCheckBox.setText("Enable passphrase encryption");
        passphraseCheckBox.addActionListener(new java.awt.event.ActionListener() {
            public void actionPerformed(java.awt.event.ActionEvent evt) {
                passphraseCheckBoxActionPerformed(evt);
            }
        });

        javax.swing.GroupLayout advancedPanelLayout = new javax.swing.GroupLayout(advancedPanel);
        advancedPanel.setLayout(advancedPanelLayout);
        advancedPanelLayout.setHorizontalGroup(
            advancedPanelLayout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
            .addGroup(advancedPanelLayout.createSequentialGroup()
                .addContainerGap()
                .addGroup(advancedPanelLayout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
                    .addGroup(advancedPanelLayout.createSequentialGroup()
                        .addComponent(len12Label)
                        .addPreferredGap(javax.swing.LayoutStyle.ComponentPlacement.RELATED, javax.swing.GroupLayout.DEFAULT_SIZE, Short.MAX_VALUE)
                        .addComponent(len18Label)
                        .addGap(203, 203, 203)
                        .addComponent(len24Label))
                    .addGroup(advancedPanelLayout.createSequentialGroup()
                        .addGroup(advancedPanelLayout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
                            .addComponent(passphraseCheckBox, javax.swing.GroupLayout.PREFERRED_SIZE, 548, javax.swing.GroupLayout.PREFERRED_SIZE)
                            .addComponent(pinCheckBox, javax.swing.GroupLayout.PREFERRED_SIZE, 548, javax.swing.GroupLayout.PREFERRED_SIZE)
                            .addComponent(lengthLabel, javax.swing.GroupLayout.PREFERRED_SIZE, 548, javax.swing.GroupLayout.PREFERRED_SIZE)
                            .addComponent(lengthSlider, javax.swing.GroupLayout.PREFERRED_SIZE, 548, javax.swing.GroupLayout.PREFERRED_SIZE)
                            .addComponent(pinLabel, javax.swing.GroupLayout.PREFERRED_SIZE, 548, javax.swing.GroupLayout.PREFERRED_SIZE)
                            .addComponent(passphraseLabel, javax.swing.GroupLayout.PREFERRED_SIZE, 548, javax.swing.GroupLayout.PREFERRED_SIZE))
                        .addGap(0, 10, Short.MAX_VALUE)))
                .addContainerGap())
        );
        advancedPanelLayout.setVerticalGroup(
            advancedPanelLayout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
            .addGroup(advancedPanelLayout.createSequentialGroup()
                .addContainerGap()
                .addComponent(lengthLabel, javax.swing.GroupLayout.PREFERRED_SIZE, 40, javax.swing.GroupLayout.PREFERRED_SIZE)
                .addPreferredGap(javax.swing.LayoutStyle.ComponentPlacement.RELATED)
                .addComponent(lengthSlider, javax.swing.GroupLayout.PREFERRED_SIZE, 40, javax.swing.GroupLayout.PREFERRED_SIZE)
                .addPreferredGap(javax.swing.LayoutStyle.ComponentPlacement.RELATED)
                .addGroup(advancedPanelLayout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
                    .addGroup(advancedPanelLayout.createParallelGroup(javax.swing.GroupLayout.Alignment.BASELINE)
                        .addComponent(len24Label)
                        .addComponent(len18Label, javax.swing.GroupLayout.PREFERRED_SIZE, 40, javax.swing.GroupLayout.PREFERRED_SIZE))
                    .addComponent(len12Label, javax.swing.GroupLayout.PREFERRED_SIZE, 40, javax.swing.GroupLayout.PREFERRED_SIZE))
                .addPreferredGap(javax.swing.LayoutStyle.ComponentPlacement.RELATED)
                .addComponent(pinLabel, javax.swing.GroupLayout.PREFERRED_SIZE, 40, javax.swing.GroupLayout.PREFERRED_SIZE)
                .addPreferredGap(javax.swing.LayoutStyle.ComponentPlacement.RELATED)
                .addComponent(pinCheckBox, javax.swing.GroupLayout.PREFERRED_SIZE, 40, javax.swing.GroupLayout.PREFERRED_SIZE)
                .addGap(18, 18, 18)
                .addComponent(passphraseLabel, javax.swing.GroupLayout.PREFERRED_SIZE, 40, javax.swing.GroupLayout.PREFERRED_SIZE)
                .addPreferredGap(javax.swing.LayoutStyle.ComponentPlacement.RELATED)
                .addComponent(passphraseCheckBox, javax.swing.GroupLayout.PREFERRED_SIZE, 40, javax.swing.GroupLayout.PREFERRED_SIZE)
                .addContainerGap(javax.swing.GroupLayout.DEFAULT_SIZE, Short.MAX_VALUE))
        );

        javax.swing.GroupLayout layout = new javax.swing.GroupLayout(getContentPane());
        getContentPane().setLayout(layout);
        layout.setHorizontalGroup(
            layout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
            .addGroup(layout.createSequentialGroup()
                .addContainerGap()
                .addGroup(layout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
                    .addGroup(javax.swing.GroupLayout.Alignment.TRAILING, layout.createSequentialGroup()
                        .addComponent(basicPanel, javax.swing.GroupLayout.DEFAULT_SIZE, javax.swing.GroupLayout.DEFAULT_SIZE, Short.MAX_VALUE)
                        .addContainerGap())
                    .addComponent(advancedPanel, javax.swing.GroupLayout.Alignment.TRAILING, javax.swing.GroupLayout.DEFAULT_SIZE, javax.swing.GroupLayout.DEFAULT_SIZE, Short.MAX_VALUE)))
            .addGroup(layout.createSequentialGroup()
                .addGap(237, 237, 237)
                .addComponent(continueButton, javax.swing.GroupLayout.PREFERRED_SIZE, 110, javax.swing.GroupLayout.PREFERRED_SIZE)
                .addGap(0, 0, Short.MAX_VALUE))
        );
        layout.setVerticalGroup(
            layout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
            .addGroup(layout.createSequentialGroup()
                .addContainerGap()
                .addComponent(basicPanel, javax.swing.GroupLayout.PREFERRED_SIZE, javax.swing.GroupLayout.DEFAULT_SIZE, javax.swing.GroupLayout.PREFERRED_SIZE)
                .addPreferredGap(javax.swing.LayoutStyle.ComponentPlacement.RELATED)
                .addComponent(advancedPanel, javax.swing.GroupLayout.PREFERRED_SIZE, javax.swing.GroupLayout.DEFAULT_SIZE, javax.swing.GroupLayout.PREFERRED_SIZE)
                .addGap(18, 18, 18)
                .addComponent(continueButton)
                .addContainerGap(22, Short.MAX_VALUE))
        );

        pack();
    }// </editor-fold>//GEN-END:initComponents

    private void languageComboBoxActionPerformed(java.awt.event.ActionEvent evt) {//GEN-FIRST:event_languageComboBoxActionPerformed
        // TODO add your handling code here:
    }//GEN-LAST:event_languageComboBoxActionPerformed

    private void continueButtonActionPerformed(java.awt.event.ActionEvent evt) {//GEN-FIRST:event_continueButtonActionPerformed
        if (device != null) {
            Language language = (Language) ((DefaultComboBoxModel) languageComboBox.getModel()).getSelectedItem();
            String label = labelTextField.getText();
            boolean pinProtection = pinCheckBox.isSelected();
            boolean passphraseProtection = passphraseCheckBox.isSelected();
            int seedLength = lengthSlider.getValue();
            
            mainController.recoverDevice(device, language.getValue(), label, seedLength, passphraseProtection, pinProtection, true);
        } else {
            JOptionPane.showMessageDialog(this, bundle.getString("MessageDialog.deviceDetached"));
        }
    }//GEN-LAST:event_continueButtonActionPerformed

    private void pinCheckBoxActionPerformed(java.awt.event.ActionEvent evt) {//GEN-FIRST:event_pinCheckBoxActionPerformed
        // TODO add your handling code here:
    }//GEN-LAST:event_pinCheckBoxActionPerformed

    private void passphraseCheckBoxActionPerformed(java.awt.event.ActionEvent evt) {//GEN-FIRST:event_passphraseCheckBoxActionPerformed
        // TODO add your handling code here:
    }//GEN-LAST:event_passphraseCheckBoxActionPerformed

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
            case SHOW_WORD_ENTRY:
                if (!wordEntryDialog.isVisible()) {
                    java.awt.EventQueue.invokeLater(new Runnable() {
                        public void run() {
                            wordEntryDialog.setVisible(true);
                            wordEntryDialog.clearWordTable();
                        }
                    });
                }
                wordEntryDialog.enableWordComboBox();
                break;
            case SHOW_OPERATION_SUCCEEDED:
                wordEntryDialog.setVisible(false);
                JOptionPane.showMessageDialog(this, bundle.getString("RecoveryDeviceDialog.MessageDialog.success"));
                this.dispose();
                break;
            case SHOW_OPERATION_FAILED:
                wordEntryDialog.setVisible(false);
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
                wordEntryDialog.setVisible(false);
                JOptionPane.showMessageDialog(this, bundle.getString("MessageDialog.deviceDetached"));
            }
        } else if (event.getEventType() == MessageEventType.DEVICE_FAILED) {
            JOptionPane.showMessageDialog(this, bundle.getString("MessageDialog.deviceOpenFaild"));
        }
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
            java.util.logging.Logger.getLogger(RecoveryDeviceDialog.class.getName()).log(java.util.logging.Level.SEVERE, null, ex);
        } catch (InstantiationException ex) {
            java.util.logging.Logger.getLogger(RecoveryDeviceDialog.class.getName()).log(java.util.logging.Level.SEVERE, null, ex);
        } catch (IllegalAccessException ex) {
            java.util.logging.Logger.getLogger(RecoveryDeviceDialog.class.getName()).log(java.util.logging.Level.SEVERE, null, ex);
        } catch (javax.swing.UnsupportedLookAndFeelException ex) {
            java.util.logging.Logger.getLogger(RecoveryDeviceDialog.class.getName()).log(java.util.logging.Level.SEVERE, null, ex);
        }
        //</editor-fold>
        //</editor-fold>

        /* Create and display the dialog */
        java.awt.EventQueue.invokeLater(new Runnable() {
            public void run() {
                RecoveryDeviceDialog dialog = new RecoveryDeviceDialog(new javax.swing.JFrame(), true, ResourceBundle.getBundle("com/bdx/bwallet/tools/ui/Bundle"), null, null);
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
    private javax.swing.JPanel advancedPanel;
    private javax.swing.JPanel basicPanel;
    private javax.swing.JButton continueButton;
    private javax.swing.JLabel labelLabel;
    private javax.swing.JTextField labelTextField;
    private javax.swing.JComboBox languageComboBox;
    private javax.swing.JLabel languageLabel;
    private javax.swing.JLabel len12Label;
    private javax.swing.JLabel len18Label;
    private javax.swing.JLabel len24Label;
    private javax.swing.JLabel lengthLabel;
    private javax.swing.JSlider lengthSlider;
    private javax.swing.JCheckBox passphraseCheckBox;
    private javax.swing.JLabel passphraseLabel;
    private javax.swing.JCheckBox pinCheckBox;
    private javax.swing.JLabel pinLabel;
    // End of variables declaration//GEN-END:variables
}
