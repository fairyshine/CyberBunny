import { registerRootComponent } from 'expo';
import './src/platform/localStorage-shim';
import App from './App';

registerRootComponent(App);
