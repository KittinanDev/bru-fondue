import {prisma} from '@/lib/prisma';
import {isAdmin,latestAssignmentOrder,type ActingUser} from '@/lib/permissions';
export async function notificationScope(user:ActingUser){
 if(isAdmin(user))return {};
 if(user.role!=='TECHNICIAN')return {ticket:{reporterId:user.id}};
 const tickets=await prisma.ticket.findMany({where:{assignments:{some:{technicianId:user.id}}},select:{id:true,assignments:{orderBy:latestAssignmentOrder,take:1,select:{technicianId:true}}}});
 return {ticketId:{in:tickets.filter(t=>t.assignments[0]?.technicianId===user.id).map(t=>t.id)}};
}
export async function unreadNotifications(user:ActingUser){const [scope,profile]=await Promise.all([notificationScope(user),prisma.user.findUnique({where:{id:user.id},select:{notificationReadAt:true,createdAt:true}})]);return prisma.ticketStatusLog.count({where:{...scope,changedById:{not:user.id},createdAt:{gt:profile?.notificationReadAt??profile?.createdAt??new Date()}}});}
export async function recentNotifications(user:ActingUser, take=5){
 const [scope,profile]=await Promise.all([notificationScope(user),prisma.user.findUnique({where:{id:user.id},select:{notificationReadAt:true,createdAt:true}})]);
 const logs=await prisma.ticketStatusLog.findMany({where:{...scope,changedById:{not:user.id},createdAt:{gte:profile?.createdAt??new Date()}},select:{id:true,ticketId:true,status:true,note:true,createdAt:true,ticket:{select:{ticketCode:true,title:true}}},orderBy:[{createdAt:'desc'},{id:'desc'}],take});
 return logs.map(log=>({...log,unread:!profile?.notificationReadAt||log.createdAt>profile.notificationReadAt}));
}
