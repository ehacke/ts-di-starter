import bunyan, { LogLevelString } from 'bunyan';
import PrettyStream from 'bunyan-prettystream';
import getenv from 'getenv';

import pjson from '../package.json';

const logLevel = getenv('LOG_LEVEL', 'info') as LogLevelString;
const showColors = getenv.bool('LOG_COLORS', false);

const prettyStdOut = new PrettyStream({ mode: 'dev', useColor: showColors });
prettyStdOut.pipe(process.stdout);

export default bunyan.createLogger({
  name: pjson.name.replace(/^@[\d-AZa-z-]+\//g, ''),
  streams: [
    {
      type: 'raw',
      level: logLevel,
      stream: prettyStdOut,
    },
  ],
});
