import { grey, green, indigo, orange, purple, } from '@mui/material/colors';

const validatedColor = (color) => (/^#([0-9A-Fa-f]{3}){1,2}$/.test(color) ? color : null);

export default (server, darkMode) => ({
  mode: darkMode ? 'dark' : 'light',
  background: {
    default: darkMode ? grey[900] : grey[50],
  },
  primary: {
    main: validatedColor(server?.attributes?.colorPrimary) || (darkMode ? indigo[200] : indigo[900]),
  },
  secondary: {
    main: validatedColor(server?.attributes?.colorSecondary) || (darkMode ? green[200] : green[800]),
  },
  orange: {
    main: validatedColor(server?.attributes?.colorPrimary) || (darkMode ? orange[600] : orange[900]),
  },
  purple: {
    main: validatedColor(server?.attributes?.colorPrimary) || (darkMode ? purple[600] : purple[900]),
  },
  grey: {
    main: validatedColor(server?.attributes?.colorPrimary) || (darkMode ? grey[500] : grey[800]),
  },
  neutral: {
    main: grey[500],
  },
  geometry: {
    main: '#3bb2d0',
  },


});
