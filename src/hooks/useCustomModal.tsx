// Hook for using custom modals
import React, { useState, useCallback } from 'react';
import CustomModal from '../components/CustomModal';

interface ModalButton {
  text: string;
  onPress: () => void;
  style?: 'default' | 'destructive' | 'primary';
  icon?: string;
}

interface ShowModalOptions {
  title: string;
  message?: string;
  buttons: ModalButton[];
  type?: 'info' | 'success' | 'warning' | 'error';
  children?: React.ReactNode;
}

export const useCustomModal = () => {
  const [modalConfig, setModalConfig] = useState<ShowModalOptions | null>(null);
  const [visible, setVisible] = useState(false);

  const showModal = useCallback((options: ShowModalOptions) => {
    setModalConfig(options);
    setVisible(true);
  }, []);

  const hideModal = useCallback(() => {
    setVisible(false);
    setTimeout(() => setModalConfig(null), 300); // Wait for animation
  }, []);

  const showConfirmModal = useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    type: 'info' | 'success' | 'warning' | 'error' = 'info'
  ) => {
    showModal({
      title,
      message,
      type,
      buttons: [
        {
          text: 'Cancel',
          onPress: onCancel || (() => {}),
          style: 'default',
        },
        {
          text: 'Confirm',
          onPress: onConfirm,
          style: 'primary',
          icon: 'checkmark',
        },
      ],
    });
  }, [showModal]);

  const showSuccessModal = useCallback((
    title: string,
    message: string,
    onOk?: () => void
  ) => {
    showModal({
      title,
      message,
      type: 'success',
      buttons: [
        {
          text: 'OK',
          onPress: onOk || (() => {}),
          style: 'primary',
          icon: 'checkmark',
        },
      ],
    });
  }, [showModal]);

  const showErrorModal = useCallback((
    title: string,
    message: string,
    onOk?: () => void
  ) => {
    showModal({
      title,
      message,
      type: 'error',
      buttons: [
        {
          text: 'OK',
          onPress: onOk || (() => {}),
          style: 'default',
        },
      ],
    });
  }, [showModal]);

  const showDeleteModal = useCallback((
    title: string,
    message: string,
    onDelete: () => void,
    onCancel?: () => void
  ) => {
    showModal({
      title,
      message,
      type: 'warning',
      buttons: [
        {
          text: 'Cancel',
          onPress: onCancel || (() => {}),
          style: 'default',
        },
        {
          text: 'Delete',
          onPress: onDelete,
          style: 'destructive',
          icon: 'trash',
        },
      ],
    });
  }, [showModal]);

  const ModalComponent = useCallback(() => {
    if (!modalConfig) return null;

    return (
      <CustomModal
        visible={visible}
        onClose={hideModal}
        title={modalConfig.title}
        message={modalConfig.message}
        buttons={modalConfig.buttons}
        type={modalConfig.type}
      >
        {modalConfig.children}
      </CustomModal>
    );
  }, [modalConfig, visible, hideModal]);

  return {
    showModal,
    hideModal,
    showConfirmModal,
    showSuccessModal,
    showErrorModal,
    showDeleteModal,
    ModalComponent,
  };
};
