import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, ShieldCheck, RefreshCw, LayoutDashboard, ClipboardList, CalendarDays, Zap, Clapperboard, BarChart3, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { fetchDepartments, updateDepartmentFeatures } from '@/services/departments.service'
import { DEPARTMENT_FEATURES, DEFAULT_DEPARTMENT_FEATURES, type DepartmentFeatureId } from '@/types/entities'

const FEATURE_ICONS: Record<DepartmentFeatureId, React.ElementType> = {
  dashboard: LayoutDashboard,
  my_tasks: ClipboardList,
  daily_tasks: CalendarDays,
  rush: Zap,
  content_creator: Clapperboard,
  reports: BarChart3,
  marketing: TrendingUp,
}

export function DepartmentAccessSettings() {
  const queryClient = useQueryClient()
  const { data: departments = [], isLoading, isError } = useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
  })

  const [selectedDeptId, setSelectedDeptId] = useState<string>('')
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const [isDirty, setIsDirty] = useState(false)

  // Auto-select first department when loaded
  useEffect(() => {
    if (departments.length > 0 && (!selectedDeptId || !departments.some(d => d.id === selectedDeptId))) {
      setSelectedDeptId(departments[0].id)
    }
  }, [departments, selectedDeptId])

  // Sync features when selected department changes
  useEffect(() => {
    const dept = departments.find(d => d.id === selectedDeptId)
    if (dept) {
      setSelectedFeatures(dept.allowed_features ?? DEFAULT_DEPARTMENT_FEATURES)
      setIsDirty(false)
    }
  }, [selectedDeptId, departments])

  const currentDept = departments.find(d => d.id === selectedDeptId)

  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedDeptId) return
      return updateDepartmentFeatures(selectedDeptId, selectedFeatures)
    },
    onSuccess: () => {
      toast.success(`Access permissions updated for ${currentDept?.name}`)
      setIsDirty(false)
      void queryClient.invalidateQueries({ queryKey: ['departments'] })
      void queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: () => {
      toast.error('Failed to update department permissions')
    },
  })

  const toggleFeature = (featureId: string) => {
    setSelectedFeatures(prev => {
      const next = prev.includes(featureId)
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId]
      setIsDirty(true)
      return next
    })
  }

  const handleSelectAll = () => {
    setSelectedFeatures(DEPARTMENT_FEATURES.map(f => f.id))
    setIsDirty(true)
  }

  const handleClearAll = () => {
    setSelectedFeatures([])
    setIsDirty(true)
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading departments...</p>
  }

  if (isError || departments.length === 0) {
    return <p className="text-sm text-destructive">No departments found or unable to load.</p>
  }

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Role & Department Navigation Theme
            </CardTitle>
            <CardDescription className="mt-1">
              Configure which sidebar menus and features are accessible for each department. Non-admin team members only see and access their enabled features and department data.
            </CardDescription>
          </div>
          {isDirty && (
            <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-300 dark:text-amber-300 dark:bg-amber-950/40">
              Unsaved changes
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Department selector pill buttons */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Select Department to Configure
          </label>
          <div className="flex flex-wrap gap-2">
            {departments.map(dept => {
              const active = dept.id === selectedDeptId
              return (
                <Button
                  key={dept.id}
                  variant={active ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    if (isDirty && !window.confirm('Discard unsaved changes for the current department?')) return
                    setSelectedDeptId(dept.id)
                  }}
                  className={active ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}
                >
                  {dept.name}
                  <span className="ml-1.5 text-[10px] opacity-70 font-mono">({dept.code})</span>
                </Button>
              )
            })}
          </div>
        </div>

        {/* Feature toggles for the selected department */}
        {currentDept && (
          <div className="space-y-4 rounded-lg border p-4 bg-muted/20">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
              <div>
                <h3 className="font-semibold text-sm">
                  Active Features for <span className="text-indigo-600 dark:text-indigo-400">{currentDept.name}</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Members of {currentDept.name} will only see the enabled items in their sidebar.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={handleSelectAll}>
                  Enable All
                </Button>
                <span className="text-muted-foreground/40">•</span>
                <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={handleClearAll}>
                  Disable All
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {DEPARTMENT_FEATURES.map(feature => {
                const Icon = FEATURE_ICONS[feature.id] ?? LayoutDashboard
                const isEnabled = selectedFeatures.includes(feature.id)

                return (
                  <div
                    key={feature.id}
                    onClick={() => toggleFeature(feature.id)}
                    className={`flex items-start justify-between p-3 rounded-lg border transition-colors cursor-pointer select-none ${
                      isEnabled
                        ? 'border-indigo-200 bg-indigo-50/50 dark:border-indigo-900/60 dark:bg-indigo-950/20'
                        : 'border-border/60 bg-background/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 p-2 rounded-md ${
                          isEnabled
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium leading-none flex items-center gap-1.5">
                          {feature.label}
                          {isEnabled && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              (Active)
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => toggleFeature(feature.id)}
                      onClick={e => e.stopPropagation()}
                      aria-label={`Enable ${feature.label} for ${currentDept.name}`}
                    />
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                disabled={!isDirty || mutation.isPending}
                onClick={() => {
                  setSelectedFeatures(currentDept.allowed_features ?? DEFAULT_DEPARTMENT_FEATURES)
                  setIsDirty(false)
                }}
              >
                Reset
              </Button>
              <Button
                size="sm"
                className="bg-emerald-700 hover:bg-emerald-800 text-white"
                disabled={!isDirty || mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-3.5 w-3.5" />
                    Save Permissions for {currentDept.name}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
