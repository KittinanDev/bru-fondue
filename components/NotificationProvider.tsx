"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type NotificationNotice={id:string;ticketId:string;status:string;note:string|null;createdAt:string;unread:boolean;ticket:{ticketCode:string;title:string}};
type NotificationState={unread:number;notices:NotificationNotice[];refresh:()=>Promise<void>};
const NotificationContext=createContext<NotificationState|null>(null);

export function NotificationProvider({initialUnread,initialNotices,children}:{initialUnread:number;initialNotices:NotificationNotice[];children:React.ReactNode}){
 const [unread,setUnread]=useState(initialUnread);
 const [notices,setNotices]=useState(initialNotices);
 const refresh=useCallback(async()=>{
  try{
   const response=await fetch('/api/notifications',{cache:'no-store'});
   if(!response.ok)return;
   const data=await response.json();
   if(typeof data.unread==='number'&&Array.isArray(data.notices)){setUnread(data.unread);setNotices(data.notices);}
  }catch{/* The next interval retries silently when the connection returns. */}
 },[]);
 useEffect(()=>{
  const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void refresh()},10000);
  const onVisible=()=>{if(document.visibilityState==='visible')void refresh()};
  window.addEventListener('focus',onVisible);window.addEventListener('bru-notifications-refresh',onVisible);document.addEventListener('visibilitychange',onVisible);
  return()=>{window.clearInterval(timer);window.removeEventListener('focus',onVisible);window.removeEventListener('bru-notifications-refresh',onVisible);document.removeEventListener('visibilitychange',onVisible)};
 },[refresh]);
 return <NotificationContext.Provider value={{unread,notices,refresh}}>{children}</NotificationContext.Provider>;
}

export function useNotifications(){const value=useContext(NotificationContext);if(!value)throw new Error('NotificationProvider is missing');return value;}
