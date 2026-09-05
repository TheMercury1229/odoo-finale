"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ArrowLeft,
  Archive,
  ArchiveRestore,
  Check,
  Package,
  IndianRupee,
  Tag,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { z } from "zod";

import type {
  Product,
  ProductPayload,
  ProductType,
} from "@/components/dashboard/products/products-api";
import {
  createProduct,
  setProductArchived,
  updateProduct,
} from "@/components/dashboard/products/products-api";
import { formatPrice } from "@/components/dashboard/products/product-utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth";
import { useUserPermissions } from "@/lib/use-user-permissions";
import { toast } from "@/components/ui/toast";

const productFormSchema = z.object({
  name: z.string().trim().min(1, "Product name is required."),
  type: z.enum(["goods", "service", "combo"], {
    message: "Select a product type.",
  }),
  salesPrice: z.coerce
    .number<number>({ message: "Sales price must be a number." })
    .positive("Sales price must be positive."),
  costPrice: z.coerce
    .number<number>({ message: "Cost price must be a number." })
    .positive("Cost price must be positive."),
  category: z.string().trim().optional(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  product?: Product;
}

function getDefaultValues(product?: Product): ProductFormValues {
  return {
    name: product?.name || "",
    type: product?.type || "goods",
    salesPrice: product ? Number(product.salesPrice) : (undefined as unknown as number),
    costPrice: product ? Number(product.costPrice) : (undefined as unknown as number),
    category: product?.category || "",
  };
}

function toPayload(values: ProductFormValues): ProductPayload {
  return {
    name: values.name.trim(),
    type: values.type,
    salesPrice: values.salesPrice,
    costPrice: values.costPrice,
    category: values.category?.trim() || undefined,
  };
}

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAdmin, canEditMasterData } = useUserPermissions();
  const [archiveOpen, setArchiveOpen] = useState(false);

  const isEditing = Boolean(product);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: getDefaultValues(product),
  });

  const prevProductIdRef = useRef<string | undefined>(product?.id);

  useEffect(() => {
    if (product && product.id !== prevProductIdRef.current) {
      prevProductIdRef.current = product.id;
      form.reset(getDefaultValues(product));
    }
  }, [product, form]);

  const saveMutation = useMutation({
    mutationFn: (values: ProductFormValues) =>
      isEditing
        ? updateProduct(product!.id, toPayload(values))
        : createProduct(toPayload(values)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.add({
        type: "success",
        title: isEditing ? "Product updated" : "Product created",
        description: isEditing
          ? "Product details have been updated."
          : "Product has been created successfully.",
      });
      router.push("/products");
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.data?.field) {
        const field = error.response.data.field as keyof ProductFormValues;
        form.setError(field, {
          type: "server",
          message: error.response.data.error,
        });
        return;
      }
      toast.add({
        type: "error",
        title: "Unable to save product",
        description:
          axios.isAxiosError(error) && error.response?.data?.error
            ? error.response.data.error
            : "Please verify all fields and try again.",
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => setProductArchived(product!.id, !product!.isArchived),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products", product?.id] });
      setArchiveOpen(false);
      toast.add({
        type: "success",
        title: product?.isArchived ? "Product restored" : "Product archived",
      });
      router.push("/products");
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      {/* ─── Top action bar ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => router.back()}
            disabled={saveMutation.isPending || archiveMutation.isPending}
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              {isEditing ? product?.name : "New Product"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isEditing
                ? "Update product information and pricing"
                : "Add a new product to your catalog"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditing && isAdmin ? (
            <Button
              type="button"
              variant={product!.isArchived ? "outline" : "destructive"}
              size="sm"
              className="gap-1.5"
              onClick={() => setArchiveOpen(true)}
              disabled={saveMutation.isPending || archiveMutation.isPending}
            >
              {product!.isArchived ? (
                <ArchiveRestore className="size-4" />
              ) : (
                <Archive className="size-4" />
              )}
              {product!.isArchived ? "Unarchive" : "Archive"}
            </Button>
          ) : null}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/products")}
            disabled={saveMutation.isPending || archiveMutation.isPending}
          >
            Cancel
          </Button>

          {canEditMasterData && (
            <Button
              type="submit"
              form="product-form"
              size="sm"
              className="gap-1.5"
              disabled={saveMutation.isPending || archiveMutation.isPending}
            >
              <Check className="size-4" />
              {saveMutation.isPending
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : "Create Product"}
            </Button>
          )}
        </div>
      </div>

      {/* ─── Archived banner if archived ─── */}
      {product?.isArchived ? (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-300">
          <Archive className="size-4" />
          <span>
            This product is currently archived. It will not appear in order line
            selection lists.
          </span>
        </div>
      ) : null}

      {/* ─── Main Form ─── */}
      <form
        id="product-form"
        onSubmit={form.handleSubmit((values) => {
          if (saveMutation.isPending || archiveMutation.isPending) return;
          saveMutation.mutate(values);
        })}
        className="grid gap-6 lg:grid-cols-[1fr_18rem]"
      >
        {/* ─── Left Column: Details ─── */}
        <div className="flex flex-col gap-6">
          {/* Card 1: General Information */}
          <Card>
            <CardHeader className="border-b pb-4">
              <div className="flex items-center gap-2">
                <Package className="size-4 text-primary" />
                <CardTitle>General Information</CardTitle>
              </div>
              <CardDescription>
                Basic product details and classification
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <FieldGroup>
                <Field data-invalid={!!form.formState.errors.name}>
                  <FieldLabel htmlFor="name">Product Name *</FieldLabel>
                  <Input
                    id="name"
                    placeholder="e.g. Office Chair, Wooden Table"
                    {...form.register("name")}
                    aria-invalid={!!form.formState.errors.name}
                  />
                  <FieldError errors={[form.formState.errors.name]} />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field data-invalid={!!form.formState.errors.type}>
                    <FieldLabel htmlFor="type">Product Type *</FieldLabel>
                    <Controller
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={(value) =>
                            field.onChange(value as ProductType)
                          }
                        >
                          <SelectTrigger
                            id="type"
                            aria-invalid={!!form.formState.errors.type}
                            className="w-full"
                          >
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="goods">Goods</SelectItem>
                            <SelectItem value="service">Service</SelectItem>
                            <SelectItem value="combo">Combo</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FieldError errors={[form.formState.errors.type]} />
                  </Field>

                  <Field data-invalid={!!form.formState.errors.category}>
                    <FieldLabel
                      htmlFor="category"
                      className="flex items-center gap-1.5"
                    >
                      <Tag className="size-3.5 text-muted-foreground" />
                      Category
                    </FieldLabel>
                    <Input
                      id="category"
                      placeholder="e.g. Furniture, Electronics"
                      {...form.register("category")}
                    />
                    <FieldError errors={[form.formState.errors.category]} />
                  </Field>
                </div>
              </FieldGroup>
            </CardContent>
          </Card>

          {/* Card 2: Pricing */}
          <Card>
            <CardHeader className="border-b pb-4">
              <div className="flex items-center gap-2">
                <IndianRupee className="size-4 text-primary" />
                <CardTitle>Pricing</CardTitle>
              </div>
              <CardDescription>
                Set the sales and cost prices for this product
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field data-invalid={!!form.formState.errors.salesPrice}>
                    <FieldLabel htmlFor="salesPrice">Sales Price *</FieldLabel>
                    <Input
                      id="salesPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...form.register("salesPrice")}
                      aria-invalid={!!form.formState.errors.salesPrice}
                    />
                    <FieldError errors={[form.formState.errors.salesPrice]} />
                  </Field>

                  <Field data-invalid={!!form.formState.errors.costPrice}>
                    <FieldLabel htmlFor="costPrice">Cost Price *</FieldLabel>
                    <Input
                      id="costPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...form.register("costPrice")}
                      aria-invalid={!!form.formState.errors.costPrice}
                    />
                    <FieldError errors={[form.formState.errors.costPrice]} />
                  </Field>
                </div>
              </FieldGroup>
            </CardContent>
          </Card>
        </div>

        {/* ─── Right Column: Summary ─── */}
        <div className="flex flex-col gap-6">
          <Card className="bg-muted/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Summary & Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Type</span>
                <Badge variant="outline" className="capitalize text-xs">
                  {form.watch("type")}
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span>Sales Price</span>
                <span className="font-medium tabular-nums text-foreground">
                  {form.watch("salesPrice")
                    ? formatPrice(form.watch("salesPrice"))
                    : "—"}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span>Cost Price</span>
                <span className="tabular-nums">
                  {form.watch("costPrice")
                    ? formatPrice(form.watch("costPrice"))
                    : "—"}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span>Category</span>
                <span>{form.watch("category") || "—"}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span>Status</span>
                <Badge
                  variant={product?.isArchived ? "destructive" : "outline"}
                  className="text-xs"
                >
                  {product?.isArchived ? "Archived" : "Active"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>

      {/* ─── Archive Confirmation Dialog ─── */}
      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {product?.isArchived ? "Unarchive" : "Archive"} product?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {product?.isArchived
                ? "This product will be restored and visible in all order line pickers."
                : "This product will be archived and hidden from order line pickers. All past order lines remain intact."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiveMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (archiveMutation.isPending) return;
                archiveMutation.mutate();
              }}
              disabled={archiveMutation.isPending}
            >
              {archiveMutation.isPending ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
