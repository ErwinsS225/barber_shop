'use client';
import {getSupabase} from '../lib/supabase';
import DemoERP from './components/DemoERP';
import ConnectedERP from './components/ConnectedERP';
export default function Home(){return getSupabase()?<ConnectedERP/>:<DemoERP/>}
