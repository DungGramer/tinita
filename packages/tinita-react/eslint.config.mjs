// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import reactConfig from '../../config/eslint-config/react-internal.js';

export default [...reactConfig, ...storybook.configs["flat/recommended"]];
