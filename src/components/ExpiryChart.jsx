import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CardSpinner } from './ui';
import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const date = new Date(label);
        const isWeekly = payload[0].payload.isWeekly;
        
        let formattedDate;
        if (isWeekly) {
            const endOfWeek = new Date(date);
            endOfWeek.setDate(date.getDate() + 6);
            formattedDate = `Week of ${date.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short'
            })} - ${endOfWeek.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short'
            })}`;
        } else {
            formattedDate = date.toLocaleDateString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short'
            });
        }
        
        const certDetails = payload[0].payload.certDetails || [];
        
        return (
            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg max-w-xs">
                <p className="text-slate-900 font-medium mb-2">{formattedDate}</p>
                <p className="text-amber-600 font-medium mb-2">
                    {payload[0].value} certificate{payload[0].value !== 1 ? 's' : ''} expiring
                </p>
                {certDetails.length > 0 && (
                    <div className="space-y-1">
                        {certDetails.map((cert, index) => (
                            <div key={index} className="text-xs border-t border-slate-200 pt-1">
                                <p className="text-slate-700 font-medium">{cert.staff_name}</p>
                                <p className="text-slate-500">{cert.template_name}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }
    return null;
};

export default function ExpiryChart({ data, loading, onFiltersChange, session }) {
    const [staffMembers, setStaffMembers] = useState([]);
    const [selectedStaff, setSelectedStaff] = useState('');
    const [startDate, setStartDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        const today = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);
        return thirtyDaysFromNow.toISOString().split('T')[0];
    });

    useEffect(() => {
        const fetchStaffMembers = async () => {
            if (!session) {
                // CRITICAL: Clear staff members when no session
                setStaffMembers([]);
                setSelectedStaff('');
                return;
            }
            
            const { data: staff } = await supabase.from('staff').select('id, full_name').eq('user_id', session.user.id).order('full_name');
            setStaffMembers(staff || []);
        };
        fetchStaffMembers();
    }, [session]);

    useEffect(() => {
        if (onFiltersChange) {
            onFiltersChange({
                staffId: selectedStaff,
                startDate,
                endDate
            });
        }
    }, [selectedStaff, startDate, endDate, onFiltersChange]);

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">Upcoming Certificate Expiries</h2>
                    <div className="flex gap-3">
                        <div className="w-32 h-8 bg-slate-200 rounded animate-pulse"></div>
                        <div className="w-32 h-8 bg-slate-200 rounded animate-pulse"></div>
                        <div className="w-40 h-8 bg-slate-200 rounded animate-pulse"></div>
                    </div>
                </div>
                <CardSpinner title="Loading chart data..." />
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">Upcoming Certificate Expiries</h2>
                    <div className="flex gap-3">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                        <select
                            value={selectedStaff}
                            onChange={(e) => setSelectedStaff(e.target.value)}
                            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        >
                            <option value="">All Staff</option>
                            {staffMembers.map(staff => (
                                <option key={staff.id} value={staff.id}>{staff.full_name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="h-64 flex items-center justify-center">
                    <p className="text-slate-500 text-center">No expiries found for the selected filters</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Upcoming Certificate Expiries</h2>
                <div className="flex gap-3">
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                    <select
                        value={selectedStaff}
                        onChange={(e) => setSelectedStaff(e.target.value)}
                        className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                        <option value="">All Staff</option>
                        {staffMembers.map(staff => (
                            <option key={staff.id} value={staff.id}>{staff.full_name}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="h-64 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{
                            top: 20,
                            right: 20,
                            left: 40,
                            bottom: 60
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis 
                            dataKey="date"
                            stroke="#64748B"
                            fontSize={12}
                            tickFormatter={(value, index, payload) => {
                                const date = new Date(value);
                                const dataPoint = data.find(d => d.date === value);
                                
                                if (dataPoint?.isWeekly) {
                                    // Show week starting date for weekly view
                                    return `${date.getDate()}/${date.getMonth() + 1}`;
                                } else {
                                    // Show day/month for daily view
                                    return `${date.getDate()}/${date.getMonth() + 1}`;
                                }
                            }}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                            interval={0}
                            minTickGap={1}
                            label={{ 
                                value: data.length > 0 && data[0].isWeekly ? 'Week Starting' : 'Expiry Date', 
                                position: 'insideBottom', 
                                offset: -5,
                                style: { textAnchor: 'middle', fill: '#64748B' }
                            }}
                        />
                        <YAxis 
                            stroke="#64748B"
                            fontSize={12}
                            allowDecimals={false}
                            domain={[0, 'dataMax']}
                            label={{ 
                                value: 'Certificates Expiring', 
                                angle: -90, 
                                position: 'insideLeft',
                                style: { textAnchor: 'middle', fill: '#64748B' }
                            }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar 
                            dataKey="count" 
                            fill="#10B981"
                            radius={[4, 4, 0, 0]}
                            className="hover:opacity-80 transition-opacity"
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
} 