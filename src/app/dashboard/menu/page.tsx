"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Badge, Button, Card, Input, Modal } from "@/components/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useMenuStore, type ApiMenuItem } from "@/store/menuStore";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function parsePrice(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100) / 100;
}

function itemMatchesQuery(item: ApiMenuItem, query: string) {
  const value = query.trim().toLowerCase();
  if (!value) return true;
  return (
    item.name.toLowerCase().includes(value) ||
    (item.description ?? "").toLowerCase().includes(value)
  );
}

function AvailabilitySwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onChange(!checked);
      }}
      className={[
        "relative inline-flex h-7 w-12 items-center rounded-full border transition-colors",
        checked ? "border-success/30 bg-success/20" : "border-secondary/20 bg-secondary/10",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-5 w-5 rounded-full border bg-white shadow-sm transition-transform",
          checked ? "translate-x-5 border-success/20" : "translate-x-1 border-secondary/20",
        ].join(" ")}
      />
    </button>
  );
}

type ItemFormState = {
  name: string;
  description: string;
  price: string;
  categoryId: string;
  available: boolean;
  image: string | null;
};

const EMPTY_ITEM_FORM: ItemFormState = {
  name: "",
  description: "",
  price: "",
  categoryId: "",
  available: true,
  image: null,
};

export default function MenuManagementPage() {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const categories = useMenuStore((state) => state.categories);
  const items = useMenuStore((state) => state.items);
  const loading = useMenuStore((state) => state.loading);
  const storeError = useMenuStore((state) => state.error);
  const fetchMenu = useMenuStore((state) => state.fetchMenu);
  const addItem = useMenuStore((state) => state.addItem);
  const updateItem = useMenuStore((state) => state.updateItem);
  const deleteItem = useMenuStore((state) => state.deleteItem);
  const toggleAvailability = useMenuStore((state) => state.toggleAvailability);
  const addCategory = useMenuStore((state) => state.addCategory);

  const [activeCategory, setActiveCategory] = React.useState<"all" | string>("all");
  const [search, setSearch] = React.useState("");

  const [itemModalOpen, setItemModalOpen] = React.useState(false);
  const [itemModalMode, setItemModalMode] = React.useState<"add" | "edit">("add");
  const [itemForm, setItemForm] = React.useState<ItemFormState>(EMPTY_ITEM_FORM);
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);
  const [itemFormError, setItemFormError] = React.useState<string | null>(null);
  const [itemSubmitting, setItemSubmitting] = React.useState(false);
  const [imageUploading, setImageUploading] = React.useState(false);
  const [imageUploadError, setImageUploadError] = React.useState<string | null>(null);

  const [categoryModalOpen, setCategoryModalOpen] = React.useState(false);
  const [categoryName, setCategoryName] = React.useState("");
  const [categoryError, setCategoryError] = React.useState<string | null>(null);
  const [categorySubmitting, setCategorySubmitting] = React.useState(false);

  const [deleteTarget, setDeleteTarget] = React.useState<ApiMenuItem | null>(null);
  const [deletingItem, setDeletingItem] = React.useState(false);
  const [pendingToggleId, setPendingToggleId] = React.useState<string | null>(null);

  React.useEffect(() => {
    void fetchMenu();
  }, [fetchMenu]);

  React.useEffect(() => {
    if (!storeError) return;
    toast.pushToast({
      variant: "error",
      title: "Menu load failed",
      message: storeError,
    });
  }, [storeError, toast]);

  const sortedCategories = React.useMemo(
    () =>
      categories
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [categories]
  );

  React.useEffect(() => {
    const action = searchParams.get("action");
    if (action !== "add") return;
    openAddItemModal();
    router.replace(pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, router, searchParams]);

  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      const categoryMatch =
        activeCategory === "all" ? true : item.category_id === activeCategory;
      return categoryMatch && itemMatchesQuery(item, search);
    });
  }, [activeCategory, items, search]);

  function openAddItemModal() {
    setItemModalMode("add");
    setEditingItemId(null);
    setItemForm({
      ...EMPTY_ITEM_FORM,
      categoryId: sortedCategories[0] ? String(sortedCategories[0].id) : "",
    });
    setItemFormError(null);
    setImageUploading(false);
    setImageUploadError(null);
    setItemModalOpen(true);
  }

  function openEditItemModal(item: ApiMenuItem) {
    setItemModalMode("edit");
    setEditingItemId(item.id);
    setItemForm({
      name: item.name,
      description: item.description ?? "",
      price: String(item.price),
      categoryId: item.category_id ? String(item.category_id) : "",
      available: item.available === 1,
      image: item.image ?? null,
    });
    setItemFormError(null);
    setImageUploading(false);
    setImageUploadError(null);
    setItemModalOpen(true);
  }

  async function uploadToImgbb(file: File) {
    const formData = new FormData();
    formData.append("image", file);
    const res = await fetch(
      "https://api.imgbb.com/1/upload?key=382747d7b513f725ce5b28e71eb1ab2b",
      { method: "POST", body: formData }
    );
    const json = (await res.json()) as {
      data?: { url?: string };
      error?: { message?: string };
    };
    if (!res.ok) throw new Error(json?.error?.message ?? `Upload failed (${res.status})`);
    const url = json?.data?.url;
    if (!url) throw new Error("Upload failed (missing url).");
    return url;
  }

  async function handleImageSelected(file: File | null) {
    if (!file) return;
    setImageUploadError(null);
    setImageUploading(true);
    try {
      const url = await uploadToImgbb(file);
      setItemForm((current) => ({ ...current, image: url }));
      toast.pushToast({
        variant: "success",
        title: "Image uploaded",
        message: "Image was uploaded successfully.",
      });
    } catch (e) {
      const message = (e as Error).message;
      setImageUploadError(message);
      toast.pushToast({ variant: "error", title: "Upload failed", message });
    } finally {
      setImageUploading(false);
    }
  }

  async function handleItemSubmit(event: React.FormEvent) {
    event.preventDefault();
    setItemFormError(null);

    const name = itemForm.name.trim();
    const price = parsePrice(itemForm.price);

    if (!name) {
      setItemFormError("Name is required.");
      return;
    }

    if (price === null) {
      setItemFormError("Price is required.");
      return;
    }

    setItemSubmitting(true);
    try {
      if (itemModalMode === "add") {
        await addItem({
          name,
          description: itemForm.description.trim() || null,
          price,
          categoryId: itemForm.categoryId || null,
          available: true,
          image: itemForm.image ?? null,
        });
        toast.pushToast({
          variant: "success",
          title: "Item added",
          message: `${name} was added to the menu.`,
        });
      } else if (editingItemId) {
        await updateItem(editingItemId, {
          name,
          description: itemForm.description.trim() || null,
          price,
          categoryId: itemForm.categoryId || null,
          available: itemForm.available,
          image: itemForm.image ?? null,
        });
        toast.pushToast({
          variant: "success",
          title: "Item updated",
          message: `${name} was updated.`,
        });
      }

      setItemModalOpen(false);
    } catch (e) {
      setItemFormError((e as Error).message);
      toast.pushToast({
        variant: "error",
        title: "Save failed",
        message: (e as Error).message,
      });
    } finally {
      setItemSubmitting(false);
    }
  }

  async function handleAddCategory(event: React.FormEvent) {
    event.preventDefault();
    const name = categoryName.trim();
    if (!name) {
      setCategoryError("Category name is required.");
      return;
    }

    setCategorySubmitting(true);
    setCategoryError(null);
    try {
      const created = await addCategory({
        name,
        sortOrder: sortedCategories.length + 1,
      });
      toast.pushToast({
        variant: "success",
        title: "Category added",
        message: `${created.name} is ready to use.`,
      });
      setCategoryName("");
      setCategoryModalOpen(false);
      if (activeCategory === "all") {
        setItemForm((current) => ({ ...current, categoryId: String(created.id) }));
      }
    } catch (e) {
      const message = (e as Error).message;
      setCategoryError(message);
      toast.pushToast({
        variant: "error",
        title: "Category failed",
        message,
      });
    } finally {
      setCategorySubmitting(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    setDeletingItem(true);
    try {
      await deleteItem(deleteTarget.id);
      toast.pushToast({
        variant: "success",
        title: "Item deleted",
        message: `${deleteTarget.name} was removed.`,
      });
      setDeleteTarget(null);
    } catch (e) {
      toast.pushToast({
        variant: "error",
        title: "Delete failed",
        message: (e as Error).message,
      });
    } finally {
      setDeletingItem(false);
    }
  }

  async function handleToggleAvailability(item: ApiMenuItem) {
    const next = item.available !== 1;
    setPendingToggleId(item.id);
    try {
      await toggleAvailability(item.id, next);
    } catch (e) {
      toast.pushToast({
        variant: "error",
        title: "Availability failed",
        message: (e as Error).message,
      });
    } finally {
      setPendingToggleId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xl font-bold tracking-tight text-foreground">
            Menu Management
          </div>
          <div className="mt-1 text-sm text-secondary/70">
            Manage categories, items, prices, and availability from the real database.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search items"
            className="w-72"
          />
          <Button variant="secondary" onClick={() => setCategoryModalOpen(true)}>
            Add Category
          </Button>
          <Button variant="primary" onClick={openAddItemModal}>
            Add Item
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <div className="flex items-center gap-2 flex-nowrap overflow-x-auto pb-1 no-scrollbar">
          <button
          type="button"
          onClick={() => setActiveCategory("all")}
          className={[
            "whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
            activeCategory === "all"
              ? "border-primary/35 bg-primary/15 text-primary"
              : "border-secondary/15 bg-white text-secondary/80 hover:bg-secondary/5",
          ].join(" ")}
        >
          All
          </button>
          {sortedCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveCategory(category.id)}
              className={[
                "whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                activeCategory === category.id
                  ? "border-primary/35 bg-primary/15 text-primary"
                  : "border-secondary/15 bg-white text-secondary/80 hover:bg-secondary/5",
              ].join(" ")}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="p-4">
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="mt-4 h-5 w-32" />
              <Skeleton className="mt-2 h-4 w-full" />
              <Skeleton className="mt-4 h-10 w-full" />
            </Card>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title="No items found"
          description="Try a different category or add a new menu item."
          cta={{ label: "Add Item", variant: "primary" }}
          onCta={openAddItemModal}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const category = sortedCategories.find((entry) => entry.id === item.category_id);
            return (
              <Card key={item.id} className="overflow-hidden">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-primary/25 via-secondary/10 to-primary/5">
                    <div className="text-sm font-black tracking-tight text-secondary/80">
                      {category?.name ?? "Menu"}
                    </div>
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-base font-bold tracking-tight text-foreground">
                        {item.name}
                      </div>
                      <div className="mt-1 text-sm text-secondary/70">
                        {item.description || "No description."}
                      </div>
                    </div>
                    <Badge variant={item.available === 1 ? "success" : "neutral"}>
                      {item.available === 1 ? "Available" : "Hidden"}
                    </Badge>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-secondary/60">Price</div>
                      <div className="text-lg font-black tracking-tight text-foreground">
                        {formatMoney(item.price)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-secondary/60">Category</div>
                      <div className="text-sm font-semibold text-foreground">
                        {category?.name ?? "Uncategorized"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between rounded-2xl border border-secondary/10 bg-background px-4 py-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">Availability</div>
                      <div className="text-xs text-secondary/60">
                        Toggle whether guests can order this item.
                      </div>
                    </div>
                    <AvailabilitySwitch
                      checked={item.available === 1}
                      disabled={pendingToggleId === item.id}
                      onChange={() => void handleToggleAvailability(item)}
                    />
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEditItemModal(item)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      className="flex-1"
                      onClick={() => setDeleteTarget(item)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-base font-bold tracking-tight text-foreground">
              Categories
            </div>
            <div className="mt-1 text-sm text-secondary/60">
              Current categories stored in SQLite.
            </div>
          </div>
          <Badge variant="neutral">{sortedCategories.length} total</Badge>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {sortedCategories.map((category) => (
            <div
              key={category.id}
              className="rounded-2xl border border-secondary/10 bg-background px-4 py-3"
            >
              <div className="text-sm font-semibold text-foreground">{category.name}</div>
              <div className="mt-1 text-xs text-secondary/60">
                {items.filter((item) => item.category_id === category.id).length} items
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal
        open={itemModalOpen}
        title={itemModalMode === "add" ? "Add Item" : "Edit Item"}
        onClose={() => {
          if (itemSubmitting) return;
          setItemModalOpen(false);
        }}
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              type="button"
              disabled={itemSubmitting}
              onClick={() => setItemModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="menu-item-form"
              disabled={itemSubmitting}
            >
              {itemSubmitting
                ? itemModalMode === "add"
                  ? "Adding..."
                  : "Saving..."
                : itemModalMode === "add"
                ? "Add Item"
                : "Save Changes"}
            </Button>
          </div>
        }
      >
        <form id="menu-item-form" onSubmit={handleItemSubmit} className="space-y-4">
          <Input
            label="Name"
            value={itemForm.name}
            onChange={(event) =>
              setItemForm((current) => ({ ...current, name: event.target.value }))
            }
            placeholder="e.g. Table Burger"
          />
          <Input
            label="Description"
            value={itemForm.description}
            onChange={(event) =>
              setItemForm((current) => ({ ...current, description: event.target.value }))
            }
            placeholder="Optional description"
          />
          <Input
            label="Price"
            value={itemForm.price}
            onChange={(event) =>
              setItemForm((current) => ({ ...current, price: event.target.value }))
            }
            placeholder="e.g. 12.50"
            inputMode="decimal"
          />

          <div className="space-y-2">
            <div className="text-sm font-semibold text-secondary/70">Image</div>
            <div
              className="rounded-2xl border border-dashed border-secondary/25 bg-background p-4"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0] ?? null;
                void handleImageSelected(file);
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">
                    Drag & drop or browse to upload
                  </div>
                  <div className="mt-1 text-xs text-secondary/60">
                    Uploads immediately to imgbb.
                  </div>
                  {imageUploading ? (
                    <div className="mt-2 text-xs font-semibold text-secondary/70">Uploading…</div>
                  ) : null}
                  {imageUploadError ? (
                    <div className="mt-2 text-xs font-semibold text-danger">{imageUploadError}</div>
                  ) : null}
                </div>
                <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-secondary/15 bg-white px-4 font-semibold text-secondary/80 hover:bg-secondary/5">
                  Browse
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      void handleImageSelected(file);
                    }}
                  />
                </label>
              </div>

              {itemForm.image ? (
                <div className="mt-4 overflow-hidden rounded-2xl border border-secondary/10 bg-white">
                  <img
                    src={itemForm.image}
                    alt="Uploaded preview"
                    className="h-48 w-full object-cover"
                  />
                </div>
              ) : null}

              {itemForm.image ? (
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="truncate text-xs text-secondary/60">{itemForm.image}</div>
                  <button
                    type="button"
                    className="shrink-0 text-xs font-semibold text-secondary/70 hover:text-secondary"
                    onClick={() => setItemForm((current) => ({ ...current, image: null }))}
                  >
                    Remove
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold text-secondary/70">Category</div>
            <select
              value={itemForm.categoryId}
              onChange={(event) =>
                setItemForm((current) => ({ ...current, categoryId: event.target.value }))
              }
              className="h-10 w-full rounded-lg border border-secondary/20 bg-background px-3 text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <option value="">No category</option>
              {sortedCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {itemModalMode === "edit" ? (
            <div className="flex items-center justify-between rounded-2xl border border-secondary/10 bg-background px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-foreground">Available</div>
                <div className="text-xs text-secondary/60">
                  Control whether guests can order this item.
                </div>
              </div>
              <AvailabilitySwitch
                checked={itemForm.available}
                disabled={itemSubmitting}
                onChange={(next) =>
                  setItemForm((current) => ({ ...current, available: next }))
                }
              />
            </div>
          ) : null}

          {itemFormError ? (
            <div className="rounded-2xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger">
              {itemFormError}
            </div>
          ) : null}
        </form>
      </Modal>

      <Modal
        open={categoryModalOpen}
        title="Add Category"
        onClose={() => {
          if (categorySubmitting) return;
          setCategoryModalOpen(false);
        }}
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              type="button"
              disabled={categorySubmitting}
              onClick={() => setCategoryModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="menu-category-form"
              disabled={categorySubmitting}
            >
              {categorySubmitting ? "Adding..." : "Add Category"}
            </Button>
          </div>
        }
      >
        <form id="menu-category-form" onSubmit={handleAddCategory} className="space-y-4">
          <Input
            label="Category Name"
            value={categoryName}
            onChange={(event) => {
              setCategoryName(event.target.value);
              setCategoryError(null);
            }}
            placeholder="e.g. Specials"
          />

          {categoryError ? (
            <div className="rounded-2xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger">
              {categoryError}
            </div>
          ) : null}
        </form>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        title="Delete Item?"
        onClose={() => {
          if (deletingItem) return;
          setDeleteTarget(null);
        }}
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              type="button"
              disabled={deletingItem}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              type="button"
              disabled={deletingItem}
              onClick={() => void handleDeleteConfirmed()}
            >
              {deletingItem ? "Deleting..." : "Delete"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="text-sm text-secondary/70">
            {deleteTarget ? `Delete ${deleteTarget.name}?` : ""}
          </div>
        </div>
      </Modal>
    </div>
  );
}
