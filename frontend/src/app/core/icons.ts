import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Bell,
  Check,
  CheckCircle2,
  ChevronLeft,
  Compass,
  Container,
  Droplets,
  Gauge,
  Grid3x3,
  HelpCircle,
  Inbox,
  Languages,
  Loader,
  Lock,
  LogOut,
  Mail,
  Play,
  RadioTower,
  Settings,
  SlidersHorizontal,
  Thermometer,
  TrendingUp,
  Waves,
  Wind,
  X,
  Zap,
} from 'lucide-angular';

export const APP_ICONS = {
  Activity, AlertCircle, AlertTriangle, ArrowDown, ArrowUp, Bell, Check, CheckCircle2,
  ChevronLeft, Compass, Container, Droplets, Gauge, Grid3x3, HelpCircle, Inbox, Languages,
  Loader, Lock, LogOut, Mail, Play, RadioTower, Settings, SlidersHorizontal, Thermometer,
  TrendingUp, Waves, Wind, X, Zap,
};

import { DeviceKind } from './models/models';

/** Map a sensor kind to its lucide icon name. */
export function iconForKind(kind: DeviceKind): string {
  switch (kind) {
    case 'Temperature': return 'thermometer';
    case 'Pressure': return 'gauge';
    case 'Vibration': return 'activity';
    case 'Flow': return 'waves';
    case 'Power': return 'zap';
    case 'Humidity': return 'droplets';
    case 'AirQuality': return 'wind';
    case 'Level': return 'container';
    default: return 'gauge';
  }
}
