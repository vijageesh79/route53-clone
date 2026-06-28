"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Checkbox from "@cloudscape-design/components/checkbox";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Container from "@cloudscape-design/components/container";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import Link from "@cloudscape-design/components/link";
import Modal from "@cloudscape-design/components/modal";
import Pagination from "@cloudscape-design/components/pagination";
import Select from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Table from "@cloudscape-design/components/table";
import Textarea from "@cloudscape-design/components/textarea";
import { useRequireAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { api, ApiError } from "@/lib/api";
import { downloadBlob } from "@/lib/format";
import { fromPagePathId } from "@/lib/paths";
import type { DNSRecord, HostedZone, RecordType, RoutingPolicy } from "@/lib/types";
import { RECORD_TYPES } from "@/lib/types";

const RECORD_TYPE_OPTIONS = RECORD_TYPES.map((t) => ({ label: t, value: t }));
const ROUTING_OPTIONS: { label: string; value: RoutingPolicy }[] = [
  { label: "Simple", value: "Simple" },
  { label: "Weighted", value: "Weighted" },
  { label: "Failover", value: "Failover" },
  { label: "Geolocation", value: "Geolocation" },
];

export default function HostedZoneDetailPage() {
  const auth = useRequireAuth();
  const params = useParams();
  const router = useRouter();
  const zoneId = fromPagePathId(params.id as string);
  const { notify } = useNotification();
  const fileRef = useRef<HTMLInputElement>(null);

  const [zone, setZone] = useState<HostedZone | null>(null);
  const [zoneError, setZoneError] = useState(false);
  const [records, setRecords] = useState<DNSRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<{ label: string; value: string } | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<DNSRecord[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<DNSRecord | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "A" as RecordType,
    ttl: "300",
    value: "",
    routing_policy: "Simple" as RoutingPolicy,
    weight: "",
    failover: "",
    alias_target: false,
  });

  const fetchZone = useCallback(async () => {
    try {
      setZone(await api.getHostedZone(zoneId));
      setZoneError(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      setZoneError(true);
      notify("error", "Failed to load zone", err instanceof ApiError ? err.message : undefined);
      router.push("/hosted-zones");
    }
  }, [zoneId, notify, router]);

  const fetchRecords = useCallback(async () => {
    if (zoneError) return;
    setLoading(true);
    try {
      const data = await api.listRecords(zoneId, {
        search: search || undefined,
        type: typeFilter?.value || undefined,
        page,
        page_size: 20,
      });
      setRecords(data.items);
      setTotalPages(data.total_pages);
      setTotal(data.total);
      setSelected([]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return;
      notify("error", "Failed to load records", err instanceof ApiError ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [zoneId, search, typeFilter, page, zoneError, notify]);

  useEffect(() => {
    if (auth.loading || !auth.user) return;
    fetchZone();
  }, [fetchZone, auth.loading, auth.user]);

  useEffect(() => {
    if (auth.loading || !auth.user || zoneError || !zone) return;
    const t = setTimeout(fetchRecords, 300);
    return () => clearTimeout(t);
  }, [fetchRecords, auth.loading, auth.user, zoneError, zone]);

  useEffect(() => {
    const handler = () => setCreateOpen(true);
    window.addEventListener("route53:create", handler);
    return () => window.removeEventListener("route53:create", handler);
  }, []);

  useEffect(() => {
    if (editRecord) {
      const rel = editRecord.name === zone?.name ? "@" : editRecord.name.replace(`.${zone?.name}`, "").replace(zone?.name || "", "");
      setForm({
        name: rel,
        type: editRecord.type as RecordType,
        ttl: String(editRecord.ttl),
        value: editRecord.value,
        routing_policy: (editRecord.routing_policy as RoutingPolicy) || "Simple",
        weight: editRecord.weight != null ? String(editRecord.weight) : "",
        failover: editRecord.failover || "",
        alias_target: editRecord.alias_target,
      });
    } else if (!createOpen) {
      setForm({ name: "", type: "A", ttl: "300", value: "", routing_policy: "Simple", weight: "", failover: "", alias_target: false });
    }
  }, [editRecord, createOpen, zone?.name]);

  const refresh = () => {
    fetchZone();
    fetchRecords();
  };

  const handleExport = async (format: "json" | "bind") => {
    try {
      const content = await api.exportHostedZone(zoneId, format);
      downloadBlob(content, `${zone?.name.replace(/\.$/, "")}.${format === "bind" ? "zone" : "json"}`, format === "bind" ? "text/plain" : "application/json");
      notify("success", "Export complete");
    } catch (err) {
      notify("error", "Export failed", err instanceof ApiError ? err.message : undefined);
    }
  };

  const handleImport = async (file: File) => {
    setSubmitting(true);
    try {
      const result = await api.importRecords(zoneId, await file.text());
      notify("success", result.message);
      refresh();
    } catch (err) {
      notify("error", "Import failed", err instanceof ApiError ? err.message : undefined);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveRecord = async () => {
    setSubmitting(true);
    try {
      const payload = {
        name: form.name || "@",
        type: form.type,
        ttl: Number(form.ttl),
        value: form.value,
        routing_policy: form.routing_policy,
        weight: form.routing_policy === "Weighted" && form.weight ? Number(form.weight) : null,
        failover: form.routing_policy === "Failover" ? form.failover || null : null,
        alias_target: form.alias_target,
      };
      if (editRecord) await api.updateRecord(zoneId, editRecord.id, payload);
      else await api.createRecord(zoneId, payload);
      notify("success", editRecord ? "Record updated" : "Record created");
      setCreateOpen(false);
      setEditRecord(null);
      refresh();
    } catch (err) {
      notify("error", "Save failed", err instanceof ApiError ? err.message : undefined);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await api.bulkDeleteRecords(zoneId, selected.map((r) => r.id));
      notify("success", `Deleted ${selected.length} record(s)`);
      setDeleteOpen(false);
      refresh();
    } catch (err) {
      notify("error", "Delete failed", err instanceof ApiError ? err.message : undefined);
    } finally {
      setSubmitting(false);
    }
  };

  if (!zone && !zoneError) {
    return (
      <Box textAlign="center" padding="xxl">
        <StatusIndicator type="loading">Loading hosted zone...</StatusIndicator>
      </Box>
    );
  }

  if (!zone) return null;

  return (
    <SpaceBetween size="l">
      <Header
        variant="h1"
        description={zone.description || `Hosted zone ID: ${zone.id}`}
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            {selected.length > 0 && <Button iconName="remove" onClick={() => setDeleteOpen(true)}>Delete ({selected.length})</Button>}
            <Button onClick={() => handleExport("json")} iconName="download">Export JSON</Button>
            <Button onClick={() => handleExport("bind")} iconName="download">Export BIND</Button>
            <Button onClick={() => fileRef.current?.click()} iconName="upload">Import BIND</Button>
            <input ref={fileRef} type="file" accept=".zone,.txt,.bind" hidden onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])} />
            <Button variant="primary" iconName="add-plus" onClick={() => setCreateOpen(true)}>Create record</Button>
          </SpaceBetween>
        }
      >
        <Link href="/hosted-zones" onFollow={(e) => { e.preventDefault(); router.push("/hosted-zones"); }}>Hosted zones</Link>
        {" / "}
        {zone.name}
      </Header>

      <ColumnLayout columns={4} variant="text-grid">
        <Container header={<Header variant="h2">Type</Header>}><StatusIndicator type={zone.type === "Public" ? "info" : "success"}>{zone.type}</StatusIndicator></Container>
        <Container header={<Header variant="h2">Record count</Header>}>{zone.record_count}</Container>
        <Container header={<Header variant="h2">Comment</Header>}>{zone.comment || "—"}</Container>
        <Container header={<Header variant="h2">VPC</Header>}>{zone.private_vpc || "—"}</Container>
      </ColumnLayout>

      <Table
        loading={loading}
        loadingText="Loading records"
        selectionType="multi"
        selectedItems={selected}
        onSelectionChange={({ detail }) => setSelected(detail.selectedItems)}
        columnDefinitions={[
          { id: "name", header: "Record name", cell: (item) => item.name, sortingField: "name" },
          { id: "type", header: "Type", cell: (item) => <Box variant="code">{item.type}</Box> },
          {
            id: "policy",
            header: "Routing policy",
            cell: (item) => (
              <SpaceBetween direction="horizontal" size="xs">
                <span>{item.routing_policy}</span>
                {item.alias_target && <StatusIndicator type="info">Alias</StatusIndicator>}
              </SpaceBetween>
            ),
          },
          { id: "value", header: "Value / Route traffic to", cell: (item) => <Box variant="code" fontSize="body-s"><span style={{ whiteSpace: "pre-wrap" }}>{item.value}</span></Box> },
          { id: "ttl", header: "TTL", cell: (item) => item.ttl },
          { id: "actions", header: "Actions", cell: (item) => <Button variant="inline-link" onClick={() => setEditRecord(item)}>Edit</Button> },
        ]}
        items={records}
        trackBy="id"
        pagination={<Pagination currentPageIndex={page} pagesCount={totalPages} onChange={({ detail }) => setPage(detail.currentPageIndex)} />}
        filter={
          <SpaceBetween direction="horizontal" size="s">
            <Input type="search" value={search} onChange={({ detail }) => { setSearch(detail.value); setPage(1); }} placeholder="Filter records" />
            <Select
              selectedOption={typeFilter}
              onChange={({ detail }) => { setTypeFilter(detail.selectedOption as { label: string; value: string }); setPage(1); }}
              placeholder="All types"
              options={[{ label: "All types", value: "" }, ...RECORD_TYPE_OPTIONS, { label: "SOA", value: "SOA" }]}
            />
            {(search || typeFilter?.value) && <Button onClick={() => { setSearch(""); setTypeFilter(null); setPage(1); }}>Clear</Button>}
          </SpaceBetween>
        }
        header={<Header counter={`(${total})`} actions={<Button iconName="refresh" onClick={fetchRecords} />}>Records</Header>}
        empty={<Box textAlign="center"><b>No records</b><Box variant="p">Create or import records to get started.</Box></Box>}
      />

      <Modal visible={createOpen || !!editRecord} onDismiss={() => { setCreateOpen(false); setEditRecord(null); }} header={editRecord ? "Edit record" : "Create record"} footer={
        <Box float="right"><SpaceBetween direction="horizontal" size="xs">
          <Button variant="link" onClick={() => { setCreateOpen(false); setEditRecord(null); }}>Cancel</Button>
          <Button variant="primary" loading={submitting} onClick={handleSaveRecord}>Save</Button>
        </SpaceBetween></Box>
      }>
        <SpaceBetween size="m">
          <FormField label="Record name" description={`Use @ for apex (${zone.name})`}>
            <Input value={form.name} onChange={({ detail }) => setForm({ ...form, name: detail.value })} placeholder="@" />
          </FormField>
          <ColumnLayout columns={2}>
            <FormField label="Type">
              <Select selectedOption={{ label: form.type, value: form.type }} onChange={({ detail }) => setForm({ ...form, type: detail.selectedOption.value as RecordType })} options={RECORD_TYPE_OPTIONS} />
            </FormField>
            <FormField label="TTL (seconds)">
              <Input type="number" value={form.ttl} onChange={({ detail }) => setForm({ ...form, ttl: detail.value })} disabled={form.alias_target} />
            </FormField>
          </ColumnLayout>
          <FormField label="Routing policy">
            <Select
              selectedOption={{ label: form.routing_policy, value: form.routing_policy }}
              onChange={({ detail }) => setForm({ ...form, routing_policy: detail.selectedOption.value as RoutingPolicy })}
              options={ROUTING_OPTIONS}
            />
          </FormField>
          {form.routing_policy === "Weighted" && (
            <FormField label="Weight"><Input type="number" value={form.weight} onChange={({ detail }) => setForm({ ...form, weight: detail.value })} /></FormField>
          )}
          {form.routing_policy === "Failover" && (
            <FormField label="Failover type">
              <Select
                selectedOption={{ label: form.failover || "Primary", value: form.failover || "PRIMARY" }}
                onChange={({ detail }) => setForm({ ...form, failover: detail.selectedOption.value || "" })}
                options={[{ label: "Primary", value: "PRIMARY" }, { label: "Secondary", value: "SECONDARY" }]}
              />
            </FormField>
          )}
          <Checkbox checked={form.alias_target} onChange={({ detail }) => setForm({ ...form, alias_target: detail.checked })}>
            Alias record
          </Checkbox>
          <FormField label="Value">
            <Textarea value={form.value} onChange={({ detail }) => setForm({ ...form, value: detail.value })} rows={4} placeholder={form.alias_target ? "alias.example.com." : "192.0.2.1"} />
          </FormField>
        </SpaceBetween>
      </Modal>

      <Modal visible={deleteOpen} onDismiss={() => setDeleteOpen(false)} header="Delete records" footer={
        <Box float="right"><SpaceBetween direction="horizontal" size="xs">
          <Button variant="link" onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button variant="primary" loading={submitting} onClick={handleDelete}>Delete</Button>
        </SpaceBetween></Box>
      }>
        Delete {selected.length} record(s)? NS/SOA apex records are skipped automatically.
      </Modal>
    </SpaceBetween>
  );
}
