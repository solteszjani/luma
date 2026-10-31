import { NextResponse } from 'next/server';
export const fail=(message:string,status=400)=>NextResponse.json({error:message},{status});
