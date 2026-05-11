'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Crown } from 'lucide-react';
import { toast } from 'sonner';

interface MembershipPlan {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  price_yearly: number;
  features: Record<string, unknown>;
  discount_percent: number;
  priority_level: number;
  is_active: boolean;
  display_order: number;
}

export default function MembershipsSettings() {
  const supabase = createClientComponentClient();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    price_monthly: 0,
    price_yearly: 0,
    discount_percent: 0,
    priority_level: 1,
    is_active: true,
    features: {
      priority_booking: false,
      discount_percent: 0,
      free_diagnostics: 0,
      vip_support: false,
      dedicated_manager: false,
    },
  });

  const fetchPlans = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (err) {
      console.error('Error fetching membership plans:', err);
      toast.error('Không thể tải danh sách gói membership');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => { fetchPlans(); });
  }, [fetchPlans]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingPlan) {
        const { error } = await supabase
          .from('membership_plans')
          .update(formData)
          .eq('id', editingPlan.id);

        if (error) throw error;
        toast.success('Cập nhật gói membership thành công');
      } else {
        const { error } = await supabase
          .from('membership_plans')
          .insert([formData]);

        if (error) throw error;
        toast.success('Thêm gói membership thành công');
      }

      setIsDialogOpen(false);
      setEditingPlan(null);
      setFormData({
        name: '',
        slug: '',
        price_monthly: 0,
        price_yearly: 0,
        discount_percent: 0,
        priority_level: 1,
        is_active: true,
        features: {
          priority_booking: false,
          discount_percent: 0,
          free_diagnostics: 0,
          vip_support: false,
          dedicated_manager: false,
        },
      });
      fetchPlans();
    } catch (err) {
      console.error('Error saving membership plan:', err);
      toast.error('Không thể lưu gói membership: ' + (err instanceof Error ? err.message : ''));
    }
  }, [editingPlan, formData, fetchPlans]);

  const togglePlanActive = useCallback(async (plan: MembershipPlan) => {
    try {
      const { error } = await supabase
        .from('membership_plans')
        .update({ is_active: !plan.is_active })
        .eq('id', plan.id);

      if (error) throw error;
      toast.success(plan.is_active ? 'Đã vô hiệu hóa gói' : 'Đã kích hoạt gói');
      fetchPlans();
    } catch (err) {
      toast.error('Không thể cập nhật trạng thái: ' + (err instanceof Error ? err.message : ''));
    }
  }, [fetchPlans]);

  const deletePlan = useCallback(async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa gói membership này?')) return;

    try {
      const { error } = await supabase
        .from('membership_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Đã xóa gói membership');
      fetchPlans();
    } catch (err) {
      toast.error('Không thể xóa: ' + (err instanceof Error ? err.message : ''));
    }
  }, [fetchPlans]);

  const editPlan = useCallback((plan: MembershipPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      slug: plan.slug,
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly,
      discount_percent: plan.discount_percent,
      priority_level: plan.priority_level,
      is_active: plan.is_active,
      features: plan.features || {
        priority_booking: false,
        discount_percent: 0,
        free_diagnostics: 0,
        vip_support: false,
        dedicated_manager: false,
      },
    });
    setIsDialogOpen(true);
  }, []);

  useEffect(() => {
    queueMicrotask(() => { fetchPlans(); });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gói Membership</h1>
          <p className="text-muted-foreground">Quản lý các gói thuê bao cho khách hàng</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingPlan(null);
              setFormData({
                name: '',
                slug: '',
                price_monthly: 0,
                price_yearly: 0,
                discount_percent: 0,
                priority_level: 1,
                is_active: true,
                features: {
                  priority_booking: false,
                  discount_percent: 0,
                  free_diagnostics: 0,
                  vip_support: false,
                  dedicated_manager: false,
                },
              });
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Thêm gói
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingPlan ? 'Chỉnh sửa gói' : 'Thêm gói mới'}</DialogTitle>
              <DialogDescription>
                Cấu hình gói membership cho khách hàng
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Tên gói</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Vàng, Bạc, Bạch kim"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="slug">Slug (URL-friendly)</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    placeholder="gold, silver, platinum"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price_monthly">Giá tháng (VNĐ)</Label>
                  <Input
                    id="price_monthly"
                    type="number"
                    min="0"
                    value={formData.price_monthly}
                    onChange={(e) => setFormData({ ...formData, price_monthly: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="price_yearly">Giá năm (VNĐ)</Label>
                  <Input
                    id="price_yearly"
                    type="number"
                    min="0"
                    value={formData.price_yearly}
                    onChange={(e) => setFormData({ ...formData, price_yearly: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="discount_percent">Giảm giá đơn hàng (%)</Label>
                  <Input
                    id="discount_percent"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.discount_percent}
                    onChange={(e) => setFormData({ ...formData, discount_percent: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="priority_level">Level ưu tiên</Label>
                  <Input
                    id="priority_level"
                    type="number"
                    min="1"
                    value={formData.priority_level}
                    onChange={(e) => setFormData({ ...formData, priority_level: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <div className="border rounded-lg p-4 space-y-2">
                <Label>Features</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.features.priority_booking}
                      onCheckedChange={(checked) => setFormData({ ...formData, features: { ...formData.features, priority_booking: checked } })}
                    />
                    <Label className="text-sm">Ưu tiên đặt lịch</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.features.vip_support}
                      onCheckedChange={(checked) => setFormData({ ...formData, features: { ...formData.features, vip_support: checked } })}
                    />
                    <Label className="text-sm">Hỗ trợ VIP</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.features.dedicated_manager}
                      onCheckedChange={(checked) => setFormData({ ...formData, features: { ...formData.features, dedicated_manager: checked } })}
                    />
                    <Label className="text-sm">Manager riêng</Label>
                  </div>
                </div>
                <div className="mt-2">
                  <Label htmlFor="free_diagnostics">Số lần chuẩn đoán miễn phí/tháng</Label>
                  <Input
                    id="free_diagnostics"
                    type="number"
                    min="0"
                    value={formData.features.free_diagnostics}
                    onChange={(e) => setFormData({ ...formData, features: { ...formData.features, free_diagnostics: parseInt(e.target.value) || 0 } })}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Kích hoạt</Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit">
                  {editingPlan ? 'Cập nhật' : 'Thêm mới'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">Danh sách gói</TabsTrigger>
          <TabsTrigger value="subscribers">Thuê bao</TabsTrigger>
          <TabsTrigger value="revenue">Doanh thu</TabsTrigger>
        </TabsList>
        <TabsContent value="plans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Các gói membership</CardTitle>
              <CardDescription>
                Quản lý các gói thuê ba định kỳ cho khách hàng
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gói</TableHead>
                    <TableHead>Giá tháng</TableHead>
                    <TableHead>Giá năm</TableHead>
                    <TableHead>Giảm giá</TableHead>
                    <TableHead>Prioriry</TableHead>
                    <TableHead>Features</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {plan.priority_level >= 4 && <Crown className="w-4 h-4 text-yellow-500" />}
                          {plan.name}
                        </div>
                      </TableCell>
                      <TableCell>{formatPrice(plan.price_monthly)}</TableCell>
                      <TableCell>{formatPrice(plan.price_yearly)}</TableCell>
                      <TableCell>{plan.discount_percent}%</TableCell>
                      <TableCell>Level {plan.priority_level}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {plan.features?.priority_booking && <Badge variant="secondary">Priority</Badge>}
                          {plan.features?.vip_support && <Badge variant="secondary">VIP</Badge>}
                          {plan.features?.free_diagnostics > 0 && (
                            <Badge variant="secondary">{plan.features.free_diagnostics} Free</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={plan.is_active}
                          onCheckedChange={() => togglePlanActive(plan)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => editPlan(plan)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deletePlan(plan.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {plans.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Chưa có gói membership nào. Hãy thêm gói đầu tiên!
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="subscribers">
          <Card>
            <CardHeader>
              <CardTitle>Thuê bao đang hoạt động</CardTitle>
              <CardDescription>Theo dõi khách hàng đăng ký membership</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Dữ liệu thuê bao sẽ hiển thị ở đây
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle>Doanh thu từ Membership</CardTitle>
              <CardDescription>Theo dõi MRR và ARR từ các gói thuê bao</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>MRR (Monthly Recurring Revenue)</CardDescription>
                    <CardTitle className="text-2xl">₫12,450,000</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">+15% so với tháng trước</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>ARR (Annual Recurring Revenue)</CardDescription>
                    <CardTitle className="text-2xl">₫149,400,000</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Dự kiến cả năm</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Tổng số subscribers</CardDescription>
                    <CardTitle className="text-2xl">87</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">+23 subscribers tháng này</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
