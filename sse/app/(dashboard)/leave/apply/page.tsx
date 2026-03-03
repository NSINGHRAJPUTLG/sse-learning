'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { applyLeave, getLeaveTypes } from '@/services/leave.service';

const schema = z.object({
  leaveTypeId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  reason: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function ApplyLeavePage() {
  const { data: leaveTypes } = useQuery({ queryKey: ['leave-types'], queryFn: () => getLeaveTypes() });
  const mutation = useMutation({ mutationFn: (payload: FormData) => applyLeave(payload) });

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (leaveTypes?.length) setValue('leaveTypeId', leaveTypes[0]._id);
  }, [leaveTypes, setValue]);

  async function onSubmit(values: FormData) {
    await mutation.mutateAsync(values);
    alert('Leave applied');
  }

  return (
    <section className="max-w-xl bg-white border rounded p-4 space-y-4">
      <h2 className="text-lg font-semibold">Apply Leave</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <select className="w-full border rounded p-2" {...register('leaveTypeId')}>
          {(leaveTypes || []).map((t: any) => <option key={t._id} value={t._id}>{t.name}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <input type="date" className="border rounded p-2" {...register('startDate')} />
          <input type="date" className="border rounded p-2" {...register('endDate')} />
        </div>
        {errors.startDate ? <p className="text-xs text-red-600">{errors.startDate.message}</p> : null}
        <textarea className="w-full border rounded p-2" rows={4} placeholder="Reason" {...register('reason')} />
        <button disabled={isSubmitting} className="bg-slate-900 text-white rounded p-2">Submit</button>
      </form>
    </section>
  );
}
