"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@cloudscape-design/components/button";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import Link from "@cloudscape-design/components/link";
import Modal from "@cloudscape-design/components/modal";
import Select from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Table from "@cloudscape-design/components/table";
import Textarea from "@cloudscape-design/components/textarea";
import Box from "@cloudscape-design/components/box";
import { useRequireAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { api, ApiError } from "@/lib/api";
import { formatDate, truncateId } from "@/lib/format";
import { toPagePathId } from "@/lib/paths";
import type { HostedZone } from "@/lib/types";

function ZoneFormFields({
  values,
  onChange,
}: {
  values: { name: string; description: string; comment: string; type: "Public" | "Private"; private_vpc: string };
  onChange: (v: typeof values) => void;
}) {
  return (
    <SpaceBetween size="m">
      <FormField label="Domain name">
        <Input value={values.name} onChange={({ detail }) => onChange({ ...values, name: detail.value })} placeholder="example.com" />
      </FormField>
      <FormField label="Description">
        <Input value={values.description} onChange={({ detail }) => onChange({ ...values, description: detail.value })} />
      </FormField>
      <FormField label="Comment">
        <Textarea value={values.comment} onChange={({ detail }) => onChange({ ...values, comment: detail.value })} rows={3} />
      </FormField>
      <FormField label="Type">
        <Select
          selectedOption={{ label: values.type === "Public" ? "Public hosted zone" : "Private hosted zone", value: values.type }}
          onChange={({ detail }) =>
            onChange({ ...values, type: detail.selectedOption.value as "Public" | "Private" })
          }
          options={[
            { label: "Public hosted zone", value: "Public" },
            { label: "Private hosted zone", value: "Private" },
          ]}
        />
      </FormField>
      {values.type === "Private" && (
        <FormField label="VPC ID">
          <Input value={values.private_vpc} onChange={({ detail }) => onChange({ ...values, private_vpc: detail.value })} placeholder="vpc-xxxxxxxx" />
        </FormField>
      )}
    </SpaceBetween>
  );
}

export default function HostedZonesPage() {
  const auth = useRequireAuth();
  const router = useRouter();
  const { notify } = useNotification();

  const [zones, setZones] = useState<HostedZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<{ label: string; value: string } | null>(null);
  const [selected, setSelected] = useState<HostedZone[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editZone, setEditZone] = useState<HostedZone | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", comment: "", type: "Public" as "Public" | "Private", private_vpc: "" });

  const fetchZones = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listHostedZones({
        search: search || undefined,
        type: typeFilter?.value || undefined,
        page: 1,
        page_size: 100,
      });
      setZones(data.items);
      setSelected([]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      notify("error", "Failed to load hosted zones", err instanceof ApiError ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, notify]);

  useEffect(() => {
    if (auth.loading || !auth.user) return;
    const t = setTimeout(fetchZones, 300);
    return () => clearTimeout(t);
  }, [fetchZones, auth.loading, auth.user]);

  useEffect(() => {
    const handler = () => setCreateOpen(true);
    window.addEventListener("route53:create", handler);
    return () => window.removeEventListener("route53:create", handler);
  }, []);

  useEffect(() => {
    if (editZone) {
      setForm({
        name: editZone.name.replace(/\.$/, ""),
        description: editZone.description || "",
        comment: editZone.comment || "",
        type: editZone.type,
        private_vpc: editZone.private_vpc || "",
      });
    } else {
      setForm({ name: "", description: "", comment: "", type: "Public", private_vpc: "" });
    }
  }, [editZone, createOpen]);

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      await api.createHostedZone(form);
      notify("success", "Hosted zone created");
      setCreateOpen(false);
      fetchZones();
    } catch (err) {
      notify("error", "Create failed", err instanceof ApiError ? err.message : undefined);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editZone) return;
    setSubmitting(true);
    try {
      await api.updateHostedZone(editZone.id, form);
      notify("success", "Hosted zone updated");
      setEditZone(null);
      fetchZones();
    } catch (err) {
      notify("error", "Update failed", err instanceof ApiError ? err.message : undefined);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      if (selected.length > 0) {
        await api.bulkDeleteHostedZones(selected.map((z) => z.id));
      }
      notify("success", `Deleted ${selected.length} hosted zone(s)`);
      setDeleteOpen(false);
      fetchZones();
    } catch (err) {
      notify("error", "Delete failed", err instanceof ApiError ? err.message : undefined);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = useMemo(() => zones, [zones]);

  return (
    <SpaceBetween size="l">
      <Header
        variant="h1"
        description="A hosted zone is a container for records that define how you want to route traffic for a domain and its subdomains."
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            {selected.length === 1 && (
              <Button iconName="edit" onClick={() => setEditZone(selected[0])}>Edit</Button>
            )}
            {selected.length > 0 && (
              <Button onClick={() => setDeleteOpen(true)} iconName="remove">
                Delete ({selected.length})
              </Button>
            )}
            <Button variant="primary" iconName="add-plus" onClick={() => setCreateOpen(true)}>
              Create hosted zone
            </Button>
          </SpaceBetween>
        }
      >
        Hosted zones
      </Header>

      <Table
        loading={loading}
        loadingText="Loading hosted zones"
        selectionType="multi"
        selectedItems={selected}
        onSelectionChange={({ detail }) => setSelected(detail.selectedItems)}
        columnDefinitions={[
          {
            id: "name",
            header: "Hosted zone name",
            cell: (item) => (
              <Link href={`/hosted-zones/${toPagePathId(item.id)}`} onFollow={(e) => { e.preventDefault(); router.push(`/hosted-zones/${toPagePathId(item.id)}`); }}>
                {item.name}
              </Link>
            ),
            sortingField: "name",
          },
          {
            id: "id",
            header: "Hosted zone ID",
            cell: (item) => <Box variant="code" fontSize="body-s"><span title={item.id}>{truncateId(item.id)}</span></Box>,
          },
          {
            id: "type",
            header: "Type",
            cell: (item) => (
              <StatusIndicator type={item.type === "Public" ? "info" : "success"}>{item.type}</StatusIndicator>
            ),
          },
          { id: "count", header: "Record count", cell: (item) => item.record_count },
          { id: "desc", header: "Description", cell: (item) => item.description || "—" },
          { id: "created", header: "Created", cell: (item) => formatDate(item.created_at) },
        ]}
        items={filtered}
        trackBy="id"
        empty={
          <Box textAlign="center" color="inherit">
            <b>No hosted zones</b>
            <Box padding={{ bottom: "s" }} variant="p" color="inherit">
              Create a hosted zone to get started.
            </Box>
            <Button onClick={() => setCreateOpen(true)}>Create hosted zone</Button>
          </Box>
        }
        filter={
          <SpaceBetween direction="horizontal" size="s">
            <Input
              type="search"
              value={search}
              onChange={({ detail }) => setSearch(detail.value)}
              placeholder="Filter by name or ID"
            />
            <Select
              selectedOption={typeFilter}
              onChange={({ detail }) => setTypeFilter(detail.selectedOption as { label: string; value: string })}
              placeholder="All types"
              options={[
                { label: "All types", value: "" },
                { label: "Public", value: "Public" },
                { label: "Private", value: "Private" },
              ]}
            />
            {(search || typeFilter?.value) && (
              <Button onClick={() => { setSearch(""); setTypeFilter(null); }}>Clear filters</Button>
            )}
          </SpaceBetween>
        }
        header={
          <Header counter={`(${filtered.length})`} actions={<Button iconName="refresh" onClick={fetchZones} />}>
            Hosted zones
          </Header>
        }
      />

      <Box fontSize="body-s" color="text-body-secondary">
        Shortcuts: ⌘K search · ⌘N create · ⌘⇧D dark mode · G then H go to hosted zones
      </Box>

      <Modal
        visible={createOpen}
        onDismiss={() => setCreateOpen(false)}
        header="Create hosted zone"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button variant="primary" loading={submitting} onClick={handleCreate}>Create</Button>
            </SpaceBetween>
          </Box>
        }
      >
        <ZoneFormFields values={form} onChange={setForm} />
      </Modal>

      <Modal
        visible={!!editZone}
        onDismiss={() => setEditZone(null)}
        header="Edit hosted zone"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setEditZone(null)}>Cancel</Button>
              <Button variant="primary" loading={submitting} onClick={handleEdit}>Save</Button>
            </SpaceBetween>
          </Box>
        }
      >
        <ZoneFormFields values={form} onChange={setForm} />
      </Modal>

      <Modal
        visible={deleteOpen}
        onDismiss={() => setDeleteOpen(false)}
        header="Delete hosted zones"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setDeleteOpen(false)}>Cancel</Button>
              <Button variant="primary" loading={submitting} onClick={handleDelete}>Delete</Button>
            </SpaceBetween>
          </Box>
        }
      >
        Delete {selected.length} hosted zone(s) and all their records?
      </Modal>
    </SpaceBetween>
  );
}
