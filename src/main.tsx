import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// StrictMode is intentionally omitted: PixiStage initialises its Application
// asynchronously, and StrictMode's double-mount would race that init/destroy.
createRoot(document.getElementById('root')!).render(<App />);
