import React, { useState } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import { snackBarDurationShortMs } from '../util/duration';

const useSnackbar = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('success');
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(snackBarDurationShortMs);

  const showSnackbar = (title, msg, severity = 'success', durationMs = snackBarDurationShortMs) => {
    setTitle(title);
    setMessage(msg);
    setSeverity(severity);
    setDuration(durationMs);
    setOpen(true);

  };

  const closeSnackbar = () => {
    setOpen(false);
  };

  const SnackbarComponent = () => (

    <Snackbar
      open={open}
      autoHideDuration={duration}
      onClose={(closeSnackbar)}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert variant="filled"
        elevation={6}
        onClose={(closeSnackbar)}
        severity={severity}
        sx={{ width: '100%' }}
      >
        {title && <AlertTitle>{title}</AlertTitle>} {/* Renderiza o título apenas se existir */}
        {message} {/* Renderiza a mensagem */}
      </Alert>
    </Snackbar>
  );

  return { showSnackbar, SnackbarComponent, closeSnackbar };
};

export default useSnackbar;

