/**
 * Student Promotion Page
 * Path: src/app/admin/sis/promotion/page.tsx
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';

export default function PromotionPage() {
  const [students] = useState([
    { id: 'STU001', name: 'Ama Asare', currentClass: 'JHS 1A', promoteTo: 'JHS 2A', status: 'passed', average: 85 },
    { id: 'STU002', name: 'Kwasi Peprah', currentClass: 'JHS 1B', promoteTo: 'JHS 2B', status: 'passed', average: 78 },
    { id: 'STU003', name: 'Abena Owusu', currentClass: 'Primary 5', promoteTo: 'Primary 6', status: 'passed', average: 90 },
    { id: 'STU004', name: 'Kojo Mensah', currentClass: 'SHS 1A', promoteTo: 'SHS 2A', status: 'at_risk', average: 65 },
  ]);

  const handlePromote = (studentId: string) => {
    console.log('Promoting student:', studentId);
    alert('Student promoted successfully!');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Student Promotion</h1>
        <p className="text-slate-400">Manage student grade transitions and promotions</p>
      </div>

      {/* Promotion Cards */}
      <div className="space-y-3">
        {students.map((student) => (
          <Card key={student.id} className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{student.name}</p>
                  <p className="text-xs text-slate-400">{student.id}</p>
                </div>

                <div className="flex items-center gap-2 mx-4">
                  <span className="text-sm font-semibold text-blue-400">{student.currentClass}</span>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-semibold text-green-400">{student.promoteTo}</span>
                </div>

                <div className="flex items-center gap-4 mr-4">
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Average Score</p>
                    <p className="text-lg font-bold text-white">{student.average}%</p>
                  </div>

                  <div>
                    {student.status === 'passed' ? (
                      <div className="flex items-center gap-1 text-green-400">
                        <CheckCircle className="h-5 w-5" />
                        <span className="text-xs font-semibold">Passed</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-yellow-400">
                        <AlertCircle className="h-5 w-5" />
                        <span className="text-xs font-semibold">At Risk</span>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  onClick={() => handlePromote(student.id)}
                  className={`${
                    student.status === 'passed'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-yellow-600 hover:bg-yellow-700'
                  } text-white`}
                >
                  Promote
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bulk Action */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">Bulk Promotion</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              Promote All Passed Students
            </Button>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white">
              Review At-Risk Students
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white">
              Export Promotion Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

