import React, { useState, useEffect } from 'react'; // Importar useState e useEffect
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Draggable from 'react-draggable';



import {
  Card,
  CardContent,
  Typography,
  CardActions,
  IconButton,
  Button,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Menu,
  MenuItem,
  CardMedia,
} from '@mui/material';

import makeStyles from '@mui/styles/makeStyles';
import CloseIcon from '@mui/icons-material/Close';
import RouteIcon from '@mui/icons-material/Route';
import DescriptionIcon from '@mui/icons-material/Description';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PendingIcon from '@mui/icons-material/Pending';
import AnchorIcon from '@mui/icons-material/Anchor';

import { useDeviceReadonly } from '../util/permissions';
import { useTranslation } from './LocalizationProvider';
import { devicesActions } from '../../store';
import { geofencesActions } from '../../store';
import { useCatch, useCatchCallback } from '../../reactHelper';
import { useAttributePreference } from '../util/preferences';
import { useRestriction } from '../util/permissions';
import RemoveDialog from './RemoveDialog';
import useSnackbar from './useSnackbar';
import PositionValue from './PositionValue';
import usePositionAttributes from '../attributes/usePositionAttributes';



const useStyles = makeStyles((theme) => ({
  card: {
    pointerEvents: 'auto',
    width: theme.dimensions.popupMaxWidth,
  },
  media: {
    height: theme.dimensions.popupImageHeight,
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  mediaButton: {
    color: theme.palette.primary.contrastText,
    mixBlendMode: 'difference',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(1, 1, 0, 2),
  },
  content: {
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
    maxHeight: theme.dimensions.cardContentMaxHeight,
    overflow: 'auto',
  },
  icon: {
    width: '25px',
    height: '25px',
    filter: 'brightness(0) invert(1)',
  },
  table: {
    '& .MuiTableCell-sizeSmall': {
      paddingLeft: 0,
      paddingRight: 0,
    },
  },
  cell: {
    borderBottom: 'none',
  },
  actions: {
    justifyContent: 'space-between',
  },
  root: ({ desktopPadding }) => ({
    pointerEvents: 'none',
    position: 'fixed',
    zIndex: 5,
    left: '50%',
    [theme.breakpoints.up('md')]: {
      left: `calc(50% + ${desktopPadding} / 2)`,
      bottom: theme.spacing(3),
    },
    [theme.breakpoints.down('md')]: {
      left: '50%',
      bottom: `calc(${theme.spacing(3)} + ${theme.dimensions.bottomBarHeight}px)`,
    },
    transform: 'translateX(-50%)',
  }),
  buttonGroup: {
    display: 'flex',
    justifyContent: 'space-around',
    padding: theme.spacing(1),
  },
}));

const StatusRow = ({ name, content }) => {
  const classes = useStyles();

  return (
    <TableRow>
      <TableCell className={classes.cell}>
        <Typography variant="body2">{name}</Typography>
      </TableCell>
      <TableCell className={classes.cell}>
        <Typography variant="body2" color="textSecondary">{content}</Typography>
      </TableCell>
    </TableRow>
  );
};


const StatusCard = ({ deviceId, position, onClose, disableActions, desktopPadding = 0 }) => {
  const classes = useStyles({ desktopPadding });
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const t = useTranslation();
  const deviceReadonly = useDeviceReadonly();
  const device = useSelector((state) => state.devices.items[deviceId]);
  const deviceImage = device?.attributes?.deviceImage;
  const disableReports = useRestriction('disableReports');
  const positionAttributes = usePositionAttributes(t);
  const positionItems = useAttributePreference('positionItems', 'fixTime,address,speed,totalDistance,geofenceIds');
  const navigationAppLink = useAttributePreference('navigationAppLink');
  const navigationAppTitle = useAttributePreference('navigationAppTitle');
  const [anchorEl, setAnchorEl] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [anchorGeofenceId, setAnchorGeofenceId] = useState(null);
  const { showSnackbar, SnackbarComponent } = useSnackbar();


  /** Inicio do bloco de funçoes da Âncora*/
  // Carrega o ID da geofence ativa, caso exista
  //Carrega o estado da âncora ao montar o componente


  useEffect(() => {
    if (!device?.name) return; // Garante que o nome do dispositivo esteja definido

    const controller = new AbortController();
    const { signal } = controller;

    fetch(`/api/geofences`, { signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Erro ${response.status}`);
        return response.json();
      })
      .then((geofences) => {
        const anchorId = geofences.find((g) => g.name === `${device.name} - Âncora`)?.id || null;
        setAnchorGeofenceId((prevId) => (prevId !== anchorId ? anchorId : prevId)); // Evita atualização desnecessária
      })
      .catch((error) => {
        if (!signal.aborted) {
          console.error("Erro ao buscar âncora:", error);
          showSnackbar('Erro', `Erro ao carregar o estado da âncora: ${error.message}`, 'error');
          setAnchorGeofenceId(null);
        }
      });

    return () => controller.abort(); // Cancela a requisição se o componente desmontar
  }, [device?.name]); // Dependência correta para evitar chamadas desnecessárias





  const handleActivateAnchor = (async () => {  // Função para Ativar a âncora (adiciona a geofence)
    try {
      const newGeofence = {
        name: `${device.name} - Âncora`,
        area: `CIRCLE (${position.latitude} ${position.longitude}, 50)`, // Círculo de 50 metros de raio
      };
      const response = await fetch('/api/geofences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newGeofence),

      });

      if (response.ok) {
        const geofence = await response.json();
        const permissionResponse = await fetch('/api/permissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId: position.deviceId, geofenceId: geofence.id }),
        });

        if (permissionResponse.ok) {
          setAnchorGeofenceId(geofence.id); // Armazena o ID da geofence de âncora
          showSnackbar('Âncora Ativada', 'Comando enviado com sucesso!', 'error');
          refreshGeofences();
        }
      }
    } catch (error) {
      showSnackbar('Aviso', 'Comando não enviado!', 'warning');
    }
  });

  const handleDeactivateAnchor = (async () => { // Função para desativar a âncora (remover a geofence)

    if (!anchorGeofenceId) return; // Certifica-se de que existe uma âncora para remover

    try {
      const response = await fetch(`/api/geofences/${anchorGeofenceId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setAnchorGeofenceId(null); // Remove o ID da geofence de âncora
        handleAnchorSendResume('engineResume');
        showSnackbar('Âncora Desativada', 'Comando enviado com sucesso!', 'info');
        refreshGeofences();
      }
    } catch (error) {
      showSnackbar('Aviso', 'Comando não enviado!', 'warning');
    }
  });

  const refreshGeofences = useCatchCallback(async () => {
    const response = await fetch('/api/geofences');
    if (response.ok) {
      dispatch(geofencesActions.refresh(await response.json()));

    } else {
      throw Error();
    }
  }, [dispatch]);


  /** Final do bloco de funçoes da Âncora*/


  /** Inicio bloco de comandos de envio engineStop engineResume*/


  const handleSendStop = async (command) => {
    try {
      const response = await fetch(`/api/commands/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId,
          type: command,
        }), Positions
      });
      if (!response.ok) {
        throw new Error('Falha ao enviar Comando');
      }
      showSnackbar('Bloqueio', 'Comando enviado com sucesso!', 'error');
    } catch (error) {
      showSnackbar('Aviso', 'Comando não enviado!', 'warning');
    }
  };

  const handleSendResume = async (command) => {
    try {
      const response = await fetch(`/api/commands/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId,
          type: command,
        }),
      });
      if (!response.ok) {
        throw new Error('Falha ao enviar Comando');
      }
      showSnackbar('Desbloqueio', 'Comando enviado com sucesso!', 'success');
    } catch (error) {
      showSnackbar('Aviso', 'Comando não enviado!', 'warning');
    }
  };

  const handleAnchorSendResume = async (command) => {
    try {
      const response = await fetch(`/api/commands/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId,
          type: command,
        }),
      });
      if (!response.ok) {
        throw new Error('Falha ao enviar Comando');
      }
    } catch (error) {
      showSnackbar('Aviso', 'Comando não enviado!', 'warning');
    }
  };

  /** Final bloco de comandos de envio engineStop, engineResume*/


  const handleRemove = useCatch(async (removed) => {
    if (removed) {
      const response = await fetch('/api/devices');
      if (response.ok) {
        dispatch(devicesActions.refresh(await response.json()));
      } else {
        throw Error(await response.text());
      }
    }
    setRemoving(false);
  });

  const handleGeofence = useCatchCallback(async () => {
    const newItem = {
      name: `${device.name} - GeoFence`,
      area: `CIRCLE (${position.latitude} ${position.longitude}, 50)`,
    };
    const response = await fetch('/api/geofences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem),
    });
    if (response.ok) {
      const item = await response.json();
      const permissionResponse = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: position.deviceId, geofenceId: item.id }),
      });
      if (!permissionResponse.ok) {
        throw Error(await permissionResponse.text());
      }
      navigate(`/settings/geofence/${item.id}`);
    } else {
      throw Error(await response.text());
    }
  }, [navigate, position]);


  return (

    <>
      <div className={classes.root}>
        {device && (
          <Draggable handle={`.${classes.media}, .${classes.header}`}>
            <Card elevation={3} className={classes.card}>
              {deviceImage ? (
                <CardMedia
                  className={classes.media}
                  image={`/api/media/${device.uniqueId}/${deviceImage}`}
                >
                  <IconButton size="small" onClick={onClose} onTouchStart={onClose}>
                    <CloseIcon fontSize="small" className={classes.mediaButton} />
                  </IconButton>
                </CardMedia>
              ) : (
                <div className={classes.header}>
                  <Typography variant="body2" color="textSecondary">
                    {device.name}
                  </Typography>
                  <IconButton size="small" onClick={onClose} onTouchStart={onClose}>
                    <CloseIcon fontSize="small" />
                  </IconButton>

                </div>

              )}

              {/** Adicionando os botões de bloqueio e desbloqueio */}
              <div className={classes.buttonGroup}>

                <Button
                  variant="contained"
                  color="error"
                  onClick={() => handleSendStop('engineStop')}>
                  {t('Stop')}
                </Button>

                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => handleSendResume('engineResume')}>
                  {t('Resume')}
                </Button>
              </div>
              {position && (
                <CardContent className={classes.content}>
                  <Table size="small" classes={{ root: classes.table }}>
                    <TableBody>
                      {positionItems
                        .split(',')
                        .filter((key) => position.hasOwnProperty(key) || position.attributes.hasOwnProperty(key))
                        .map((key) => (
                          <StatusRow
                            key={key}
                            name={positionAttributes[key]?.name || key}
                            content={<PositionValue
                              position={position}
                              property={position.hasOwnProperty(key) ? key : null}
                              attribute={position.hasOwnProperty(key) ? null : key} />} />
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              )}

              <CardActions classes={{ root: classes.actions }} disableSpacing>


                <IconButton color="secondary" onClick={(e) => setAnchorEl(e.currentTarget)} disabled={!position}>
                  <PendingIcon />
                </IconButton>

                <IconButton color="primary" onClick={() => navigate('/replay')} disabled={disableActions || !position}>
                  <RouteIcon />
                </IconButton>

                <IconButton color="orange" onClick={() => navigate(`/reports/event`)} disabled={disableActions || !position || disableReports || deviceReadonly}>
                  <DescriptionIcon />
                </IconButton>

                <IconButton color="grey" onClick={() => navigate(`/settings/device/${deviceId}`)} disabled={disableActions || !position || deviceReadonly}>
                  <EditIcon />
                </IconButton>

                <IconButton
                  onClick={anchorGeofenceId ? handleDeactivateAnchor : handleActivateAnchor}
                  color={anchorGeofenceId ? "error" : "primary"} disabled={disableActions || !position || deviceReadonly}>
                  <AnchorIcon />
                </IconButton>

                <IconButton color="error" onClick={() => setRemoving(true)} disabled={disableActions || !position || deviceReadonly}>
                  <DeleteIcon />

                </IconButton>
              </CardActions>
            </Card>
          </Draggable>
        )}



      </div>
      {position && (
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          <MenuItem onClick={() => navigate(`/position/${position.id}`)}>
            <Typography color="secondary">{t('sharedShowDetails')}</Typography>
          </MenuItem>
          <MenuItem onClick={handleGeofence}>{t('sharedCreateGeofence')}</MenuItem>
          <MenuItem component="a" target="_blank" href={`https://www.google.com/maps/search/?api=1&query=${position.latitude}%2C${position.longitude}`}>
            {t('linkGoogleMaps')}
          </MenuItem>
          <MenuItem component="a" target="_blank" href={`http://maps.apple.com/?ll=${position.latitude},${position.longitude}`}>
            {t('linkAppleMaps')}
          </MenuItem>
          <MenuItem component="a" target="_blank" href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${position.latitude}%2C${position.longitude}&heading=${position.course}`}>
            {t('linkStreetView')}
          </MenuItem>
          {navigationAppTitle && (
            <MenuItem component="a" target="_blank" href={navigationAppLink.replace('{latitude}', position.latitude).replace('{longitude}', position.longitude)}>
              {navigationAppTitle}
            </MenuItem>
          )}
        </Menu>
      )}
      <RemoveDialog open={removing} endpoint="devices" itemId={deviceId} onResult={(removed) => handleRemove(removed)} />

      <SnackbarComponent />
    </>
  );
};

export default StatusCard;

