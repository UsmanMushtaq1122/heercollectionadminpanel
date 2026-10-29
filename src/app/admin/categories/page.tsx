"use client"

import { useState, useRef, useCallback }  from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Plus,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Grid3X3,
  List,
  Upload,
  Trash2,
  Pencil,
  ArrowUp,
  ArrowDown,
  Search,
  X,
  Image as ImageIcon,
  Layers,
  AlertCircle,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { categorySchema } from "@/lib/validations"
import { cn } from "@/lib/utils"
import type { Category } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState } from "@/components/ui/empty-state"
import { useToast } from "@/components/ui/toast"
import { adminCategoryService } from "@/lib/admin-services"

interface CategoryItem extends Category {
  productCount: number
  subcategoryCount: number
  isActive: boolean
  image?: string
  children?: CategoryItem[]
  subcategories?: CategoryItem[]
}

function buildCategoryTree(cats: Category[]): CategoryItem[] {
  const byId = new Map<string, Category>(cats.map((c) => [c.id, c]))
  const itemMap = new Map<string, CategoryItem>()
  cats.forEach((c) => {
    itemMap.set(c.id, {
      ...c,
      productCount: c.productCount ?? 0,
      subcategoryCount: 0,
      image: c.image,
      children: [],
      subcategories: [],
    })
  })

  const sortChildren = (item: CategoryItem) => {
    item.children?.sort((a, b) => a.sortOrder - b.sortOrder)
    item.subcategories?.sort((a, b) => a.sortOrder - b.sortOrder)
  }

  const roots: CategoryItem[] = []
  itemMap.forEach((item, id) => {
    const parentId = byId.get(id)?.parentId
    if (parentId && itemMap.has(parentId)) {
      const parent = itemMap.get(parentId)!
      parent.children!.push(item)
      parent.subcategories!.push(item)
      parent.subcategoryCount = parent.children!.length
    } else {
      roots.push(item)
    }
  })

  roots.sort((a, b) => a.sortOrder - b.sortOrder)
  roots.forEach(sortChildren)
  return roots
}

interface CategoryFormData {
  name: string
  description: string
  parentId: string
  image: string
  seoTitle: string
  seoDescription: string
  isActive: boolean
}

export default function CategoriesPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [expandedIds, setExpandedIds] = useState<string[]>(["1", "2", "3", "4", "5"])
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<CategoryItem | null>(null)

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema) as any,
    defaultValues: {
      name: "",
      description: "",
      parentId: "",
      image: "",
      seoTitle: "",
      seoDescription: "",
      isActive: true,
    },
  })

  const optimizeImage = useCallback(async (file: File): Promise<File> => {
    const maxBytes = 900 * 1024
    const maxDimension = 1600

    if (file.size <= maxBytes) {
      return file
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error("Unable to read image"))
      reader.readAsDataURL(file)
    })

    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const loadedImage = new Image()
      loadedImage.onload = () => resolve(loadedImage)
      loadedImage.onerror = () => reject(new Error("Unable to process image"))
      loadedImage.src = dataUrl
    })

    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext("2d")
    if (!context) {
      throw new Error("Unable to create image canvas")
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    let quality = 0.8
    let blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    )

    while (blob && blob.size > maxBytes && quality > 0.4) {
      quality -= 0.1
      blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality)
      )
    }

    if (!blob || blob.size > maxBytes) {
      throw new Error("Image could not be reduced below the upload limit")
    }

    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    })
  }, [])

  const handleImageSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return
    if (file.size > 10 * 1024 * 1024) {
      toast("error", "Image must be 10MB or smaller")
      return
    }
    try {
      const optimizedFile = await optimizeImage(file)
      setImageFile(optimizedFile)
      const reader = new FileReader()
      reader.onload = () => setImagePreview(String(reader.result))
      reader.readAsDataURL(optimizedFile)
    } catch {
      toast("error", "The image could not be processed. Please choose another image.")
    }
  }, [optimizeImage, toast])

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleImageSelect(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleImageSelect(file)
  }

  const clearImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setValue("image", "")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const {
    data: categories = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await adminCategoryService.list()
      return buildCategoryTree(res.filter((category) => category.slug !== "uncategorized"))
    },
    retry: 1,
  })

  const createMutation = useMutation({
    mutationFn: (formData: FormData) =>
      adminCategoryService.createWithImage(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      setIsDialogOpen(false)
      reset()
      clearImage()
      toast("success", "Category created successfully")
    },
    onError: () => {
      toast("error", "Failed to create category")
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, formData }: { id: string; formData: FormData }) =>
      adminCategoryService.updateWithImage(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      setIsDialogOpen(false)
      setEditingCategory(null)
      reset()
      clearImage()
      toast("success", "Category updated successfully")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminCategoryService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      setIsDeleteDialogOpen(false)
      setDeletingCategory(null)
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id }: { id: string; isActive: boolean }) =>
      adminCategoryService.toggle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] })
    },
  })

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const handleEdit = (category: CategoryItem) => {
    setEditingCategory(category)
    setValue("name", category.name)
    setValue("description", category.description || "")
    setValue("parentId", category.parentId || "")
    setValue("image", category.image || "")
    setValue("seoTitle", category.name)
    setValue("seoDescription", category.description || "")
    setValue("isActive", category.isActive)
    // Show existing image as preview
    setImageFile(null)
    setImagePreview(category.image || null)
    setIsDialogOpen(true)
  }

  const handleCreate = () => {
    setEditingCategory(null)
    reset({
      name: "",
      description: "",
      parentId: "",
      image: "",
      seoTitle: "",
      seoDescription: "",
      isActive: true,
    })
    clearImage()
    setIsDialogOpen(true)
  }

  const onSubmit = (data: any) => {
    const formData = new FormData()
    formData.append("name", data.name)
    formData.append("description", data.description || "")
    formData.append("parentId", data.parentId || "")
    formData.append("seoTitle", data.seoTitle || "")
    formData.append("seoDescription", data.seoDescription || "")
    formData.append("isActive", String(data.isActive))
    if (imageFile) {
      formData.append("image", imageFile)
    } else if (data.image) {
      formData.append("image", data.image)
    }
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const parentCategories = categories.filter((cat) => !cat.parentId)

  const getDisplayCategories = (cats: CategoryItem[]): CategoryItem[] => {
    return cats.map((cat) => ({
      ...cat,
      children: expandedIds.includes(cat.id) ? cat.children : undefined,
    }))
  }

  const moveCategory = (categoryId: string, direction: "up" | "down") => {
    const idx = categories.findIndex((c) => c.id === categoryId)
    if (direction === "up" && idx > 0) {
      const newCats = [...categories]
      ;[newCats[idx - 1], newCats[idx]] = [newCats[idx], newCats[idx - 1]]
    } else if (direction === "down" && idx < categories.length - 1) {
      const newCats = [...categories]
      ;[newCats[idx], newCats[idx + 1]] = [newCats[idx + 1], newCats[idx]]
    }
  }

  const renderCategoryCard = (category: CategoryItem, isChild = false) => {
    const isExpanded = expandedIds.includes(category.id)
    const hasChildren = category.children && category.children.length > 0

    return (
      <div key={category.id}>
        <motion.div
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={cn(
            "group border border-[#F8F5F2]/10 bg-[#1A1A1A] hover:border-[#C9A27E]/30 transition-all duration-300",
            isChild ? "ml-8 border-l-2 border-l-[#C9A27E]/30" : "rounded-sm"
          )}
        >
          {viewMode === "grid" ? (
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {hasChildren && !isChild && (
                    <button
                      onClick={() => toggleExpand(category.id)}
                      className="text-[#F8F5F2]/50 hover:text-[#C9A27E] transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  <div className="w-12 h-12 rounded-sm bg-[#F8F5F2]/5 flex items-center justify-center overflow-hidden">
                    {category.image ? (
                      <div className="w-full h-full bg-gradient-to-br from-[#C9A27E]/20 to-[#DC2626]/20 flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-[#C9A27E]/60" />
                      </div>
                    ) : (
                      <ImageIcon className="w-5 h-5 text-[#F8F5F2]/30" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-[#F8F5F2] text-sm">{category.name}</h3>
                    <p className="text-xs text-[#F8F5F2]/40 mt-0.5">
                      {category.productCount} products
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={category.isActive}
                    onCheckedChange={(checked) =>
                      toggleMutation.mutate({ id: category.id, isActive: checked })
                    }
                    className="data-[state=checked]:bg-[#C9A27E]"
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 text-[#F8F5F2]/50 hover:text-[#C9A27E]"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="bg-[#2A2A2A] border-[#F8F5F2]/10"
                    >
                      <DropdownMenuItem
                        onClick={() => handleEdit(category)}
                        className="text-[#F8F5F2] hover:bg-[#F8F5F2]/5 focus:bg-[#F8F5F2]/5"
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      {!isChild && (
                        <>
                          <DropdownMenuItem
                            onClick={() => moveCategory(category.id, "up")}
                            className="text-[#F8F5F2] hover:bg-[#F8F5F2]/5 focus:bg-[#F8F5F2]/5"
                          >
                            <ArrowUp className="w-4 h-4 mr-2" />
                            Move Up
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => moveCategory(category.id, "down")}
                            className="text-[#F8F5F2] hover:bg-[#F8F5F2]/5 focus:bg-[#F8F5F2]/5"
                          >
                            <ArrowDown className="w-4 h-4 mr-2" />
                            Move Down
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuItem
                        onClick={() => {
                          setDeletingCategory(category)
                          setIsDeleteDialogOpen(true)
                        }}
                        className="text-red-400 hover:bg-red-400/10 focus:bg-red-400/10"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              {!isChild && category.children && (
                <div className="flex items-center gap-4 text-xs text-[#F8F5F2]/40 mt-2 pt-2 border-t border-[#F8F5F2]/5">
                  <span>{category.subcategoryCount} subcategories</span>
                  <span>{category.productCount} products</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-4 p-3 px-4">
              {hasChildren && !isChild && (
                <button
                  onClick={() => toggleExpand(category.id)}
                  className="text-[#F8F5F2]/50 hover:text-[#C9A27E] transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              )}
              <div className="w-10 h-10 rounded-sm bg-[#F8F5F2]/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                {category.image ? (
                  <div className="w-full h-full bg-gradient-to-br from-[#C9A27E]/20 to-[#DC2626]/20 flex items-center justify-center">
                    <ImageIcon className="w-4 h-4 text-[#C9A27E]/60" />
                  </div>
                ) : (
                  <ImageIcon className="w-4 h-4 text-[#F8F5F2]/30" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-[#F8F5F2] text-sm truncate">
                  {category.name}
                </h3>
                <p className="text-xs text-[#F8F5F2]/40 truncate">
                  {category.description || "No description"}
                </p>
              </div>
              <div className="text-xs text-[#F8F5F2]/50 w-24 text-right">
                {category.productCount} products
              </div>
              <div className="text-xs text-[#F8F5F2]/50 w-28 text-right">
                {category.subcategoryCount} subcategories
              </div>
              <Switch
                checked={category.isActive}
                onCheckedChange={(checked) =>
                  toggleMutation.mutate({ id: category.id, isActive: checked })
                }
                className="data-[state=checked]:bg-[#C9A27E]"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 text-[#F8F5F2]/50 hover:text-[#C9A27E]"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-[#2A2A2A] border-[#F8F5F2]/10"
                >
                  <DropdownMenuItem
                    onClick={() => handleEdit(category)}
                    className="text-[#F8F5F2] hover:bg-[#F8F5F2]/5 focus:bg-[#F8F5F2]/5"
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  {!isChild && (
                    <>
                      <DropdownMenuItem
                        onClick={() => moveCategory(category.id, "up")}
                        className="text-[#F8F5F2] hover:bg-[#F8F5F2]/5 focus:bg-[#F8F5F2]/5"
                      >
                        <ArrowUp className="w-4 h-4 mr-2" />
                        Move Up
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => moveCategory(category.id, "down")}
                        className="text-[#F8F5F2] hover:bg-[#F8F5F2]/5 focus:bg-[#F8F5F2]/5"
                      >
                        <ArrowDown className="w-4 h-4 mr-2" />
                        Move Down
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem
                    onClick={() => {
                      setDeletingCategory(category)
                      setIsDeleteDialogOpen(true)
                    }}
                    className="text-red-400 hover:bg-red-400/10 focus:bg-red-400/10"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </motion.div>

        <AnimatePresence>
          {isExpanded && category.children && viewMode === "grid" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-1 mt-1"
            >
              {category.children.map((child) => renderCategoryCard(child, true))}
            </motion.div>
          )}
        </AnimatePresence>

        {isExpanded && category.children && viewMode === "list" && (
          <div className="space-y-1 mt-1">
            {category.children.map((child) => renderCategoryCard(child, true))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-light text-[#F8F5F2] tracking-wide">
              Categories
            </h1>
            <p className="text-sm text-[#F8F5F2]/40 mt-1">
              Manage your product categories and subcategories
            </p>
          </div>
          <Button
            onClick={handleCreate}
            className="bg-[#C9A27E] hover:bg-[#C9A27E]/90 text-[#1A1A1A] font-medium px-5 py-2.5 rounded-sm transition-all duration-300"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#F8F5F2]/30" />
              <Input
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64 bg-[#F8F5F2]/5 border-[#F8F5F2]/10 text-[#F8F5F2] placeholder:text-[#F8F5F2]/30 focus:border-[#C9A27E]/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#F8F5F2]/30 hover:text-[#F8F5F2]/60"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 bg-[#F8F5F2]/5 rounded-sm p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-2 rounded-sm transition-all duration-200",
                viewMode === "grid"
                  ? "bg-[#C9A27E]/20 text-[#C9A27E]"
                  : "text-[#F8F5F2]/40 hover:text-[#F8F5F2]/60"
              )}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-2 rounded-sm transition-all duration-200",
                viewMode === "list"
                  ? "bg-[#C9A27E]/20 text-[#C9A27E]"
                  : "text-[#F8F5F2]/40 hover:text-[#F8F5F2]/60"
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-sm bg-[#F8F5F2]/5 animate-pulse"
              />
            ))}
          </div>
        ) : isError ? (
          <div className="border border-[#F8F5F2]/10 bg-[#242424] rounded-sm p-8 text-center my-6">
            <div className="w-16 h-16 rounded-full bg-[#C9A27E]/10 border border-[#C9A27E]/20 flex items-center justify-center mx-auto mb-4 text-[#C9A27E]">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-light text-[#F8F5F2] tracking-wide">
              Category Service Offline
            </h3>
            <div className="mt-2 h-px w-12 bg-[#C9A27E] mx-auto" />
            <p className="mt-3 text-sm text-[#F8F5F2]/60 max-w-md mx-auto leading-relaxed">
              Unable to reach the backend database. Please ensure your backend server is running and configured correctly.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button
                variant="ghost"
                onClick={() => refetch()}
                className="text-[#C9A27E] border border-[#C9A27E]/40 hover:bg-[#C9A27E]/10 px-5"
              >
                Retry Connection
              </Button>
              <Button
                onClick={handleCreate}
                className="bg-[#C9A27E] hover:bg-[#C9A27E]/90 text-[#1A1A1A] font-medium px-5"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </div>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="border border-[#F8F5F2]/10 bg-[#242424]/60 rounded-sm my-6">
            <EmptyState
              dark={true}
              icon={<Layers className="w-10 h-10 text-[#C9A27E]" />}
              title={
                searchQuery
                  ? "No Matching Categories Found"
                  : "No Product Categories Yet"
              }
              description={
                searchQuery
                  ? `We couldn't find any category matching "${searchQuery}". Try refining your keywords.`
                  : "Organize your boutique collections by creating your first luxury product category."
              }
              action={
                searchQuery
                  ? {
                      label: "Clear Search Filter",
                      onClick: () => setSearchQuery(""),
                    }
                  : {
                      label: "+ Add Your First Category",
                      onClick: handleCreate,
                    }
              }
            />
          </div>
        ) : (
          <div className="space-y-1">
            <AnimatePresence mode="popLayout">
              {viewMode === "list" && (
                <div className="flex items-center gap-4 px-4 py-2 text-xs text-[#F8F5F2]/30 border-b border-[#F8F5F2]/10">
                  <div className="w-10" />
                  <div className="w-10" />
                  <div className="flex-1">Category</div>
                  <div className="w-24 text-right">Products</div>
                  <div className="w-28 text-right">Subcategories</div>
                  <div className="w-12">Active</div>
                  <div className="w-8" />
                </div>
              )}
              {getDisplayCategories(filteredCategories).map((category) =>
                renderCategoryCard(category)
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#2A2A2A] border-[#F8F5F2]/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#F8F5F2] font-light tracking-wide">
              {editingCategory ? "Edit Category" : "Create Category"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="max-h-[60vh] overflow-y-auto pr-1.5 space-y-5 pb-4">
              <div className="space-y-2">
                <label className="text-sm text-[#F8F5F2]/60">Name</label>
                <Input
                  {...register("name")}
                  placeholder="Category name"
                  className="bg-[#F8F5F2]/5 border-[#F8F5F2]/10 text-[#F8F5F2] placeholder:text-[#F8F5F2]/30 focus:outline-none focus:ring-2 focus:ring-[#C9A27E]/30 focus:border-[#C9A27E] transition-all duration-200"
                />
                {errors.name && (
                  <p className="text-xs text-red-400">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm text-[#F8F5F2]/60">Description</label>
                <Textarea
                  {...register("description")}
                  placeholder="Category description"
                  rows={3}
                  className="bg-[#F8F5F2]/5 border-[#F8F5F2]/10 text-[#F8F5F2] placeholder:text-[#F8F5F2]/30 focus:outline-none focus:ring-2 focus:ring-[#C9A27E]/30 focus:border-[#C9A27E] transition-all duration-200 resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-[#F8F5F2]/60">Parent Category</label>
                <div className="relative">
                  <select
                    value={watch("parentId")}
                    onChange={(e) => setValue("parentId", e.target.value)}
                    className="flex h-10 w-full appearance-none rounded-sm border border-[#F8F5F2]/10 bg-[#F8F5F2]/5 px-3 py-2 pr-10 text-sm text-[#F8F5F2] transition-colors focus:outline-none focus:ring-2 focus:ring-[#C9A27E]/30 focus:border-[#C9A27E]"
                  >
                    <option value="" className="bg-[#2A2A2A] text-[#F8F5F2]">
                      None (Top level)
                    </option>
                    {parentCategories.map((cat) => (
                      <option
                        key={cat.id}
                        value={cat.id}
                        className="bg-[#2A2A2A] text-[#F8F5F2]"
                      >
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F8F5F2]/40 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-[#F8F5F2]/60">Image</label>

                {/* Hidden native file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleFileInputChange}
                />

                {imagePreview ? (
                  /* ── Preview state ── */
                  <div className="relative rounded-sm overflow-hidden border border-[#F8F5F2]/10 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="Category preview"
                      className="w-full h-40 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-white text-xs bg-[#C9A27E] hover:bg-[#C9A27E]/80 px-3 py-1.5 rounded-sm transition-colors"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={clearImage}
                        className="text-white text-xs bg-red-500/70 hover:bg-red-500 px-3 py-1.5 rounded-sm transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                    {imageFile && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-3 py-1.5">
                        <p className="text-xs text-[#F8F5F2]/70 truncate">{imageFile.name}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ── Drop zone ── */
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label="Click to upload category image"
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                      "border-2 border-dashed rounded-sm p-6 text-center transition-all duration-200 cursor-pointer select-none",
                      isDragging
                        ? "border-[#C9A27E] bg-[#C9A27E]/5"
                        : "border-[#F8F5F2]/10 hover:border-[#C9A27E]/40 hover:bg-[#F8F5F2]/3"
                    )}
                  >
                    <Upload className={cn(
                      "w-8 h-8 mx-auto mb-2 transition-colors",
                      isDragging ? "text-[#C9A27E]" : "text-[#F8F5F2]/20"
                    )} />
                    <p className="text-sm text-[#F8F5F2]/40">
                      {isDragging ? "Drop image here" : "Click to upload or drag and drop"}
                    </p>
                    <p className="text-xs text-[#F8F5F2]/20 mt-1">PNG, JPG, WebP up to 10MB (optimized automatically)</p>
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-2 border-t border-[#F8F5F2]/10">
                <p className="text-xs text-[#F8F5F2]/30 uppercase tracking-wider">
                  SEO Settings
                </p>
                <div className="space-y-2">
                  <label className="text-sm text-[#F8F5F2]/60">SEO Title</label>
                  <Input
                    {...register("seoTitle")}
                    placeholder="SEO title"
                    className="bg-[#F8F5F2]/5 border-[#F8F5F2]/10 text-[#F8F5F2] placeholder:text-[#F8F5F2]/30 focus:outline-none focus:ring-2 focus:ring-[#C9A27E]/30 focus:border-[#C9A27E] transition-all duration-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-[#F8F5F2]/60">
                    SEO Description
                  </label>
                  <Textarea
                    {...register("seoDescription")}
                    placeholder="SEO description"
                    rows={2}
                    className="bg-[#F8F5F2]/5 border-[#F8F5F2]/10 text-[#F8F5F2] placeholder:text-[#F8F5F2]/30 focus:outline-none focus:ring-2 focus:ring-[#C9A27E]/30 focus:border-[#C9A27E] transition-all duration-200 resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="text-sm text-[#F8F5F2]/60">Active</label>
                <Switch
                  checked={watch("isActive")}
                  onCheckedChange={(checked) => setValue("isActive", checked)}
                  className="data-[state=checked]:bg-[#C9A27E]"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-[#F8F5F2]/10">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsDialogOpen(false)
                  setEditingCategory(null)
                  reset()
                  clearImage()
                }}
                className="text-[#F8F5F2]/60 hover:text-[#F8F5F2] hover:bg-[#F8F5F2]/5"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-[#C9A27E] hover:bg-[#C9A27E]/90 text-[#1A1A1A] font-medium px-6"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : editingCategory
                  ? "Update Category"
                  : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-[#2A2A2A] border-[#F8F5F2]/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#F8F5F2] font-light tracking-wide">
              Delete Category
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-[#F8F5F2]/60">
              Are you sure you want to delete{" "}
              <span className="text-[#F8F5F2] font-medium">
                {deletingCategory?.name}
              </span>
              ? This action cannot be undone.
            </p>
            {deletingCategory?.children && deletingCategory.children.length > 0 && (
              <p className="text-xs text-red-400/80 mt-2">
                This category has {deletingCategory.children.length} subcategories
                that will also be deleted.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setDeletingCategory(null)
              }}
              className="text-[#F8F5F2]/60 hover:text-[#F8F5F2] hover:bg-[#F8F5F2]/5"
            >
              Cancel
            </Button>
            <Button
              onClick={() => deletingCategory && deleteMutation.mutate(deletingCategory.id)}
              disabled={deleteMutation.isPending}
              className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}