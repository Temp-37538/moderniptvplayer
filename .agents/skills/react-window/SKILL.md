# react-window

react-window is a React component library designed to efficiently render large lists and grids of data with optimal performance. It implements windowing (or virtualization), which means only the visible rows or cells are rendered to the DOM, dramatically improving rendering performance for datasets with thousands or millions of items. This approach eliminates the performance bottlenecks typically associated with rendering large amounts of data by only mounting DOM nodes for elements currently in the viewport.

The library provides two primary components: List for one-dimensional data and Grid for two-dimensional data. Both components support fixed and dynamic sizing, customizable overscan for smooth scrolling, RTL (right-to-left) text direction, imperative scrolling APIs, and full TypeScript support. The library is widely used in production applications including React DevTools and the Replay browser, demonstrating its reliability and performance characteristics.

## List Component - Fixed Height Rows

Basic list implementation with fixed-height rows for rendering large datasets efficiently.

```tsx
import { List, type RowComponentProps } from "react-window";

// Define the row component
function RowComponent({
  index,
  names,
  style
}: RowComponentProps<{
  names: string[];
}>) {
  return (
    <div style={style}>
      {names[index]} - Row {index + 1}
    </div>
  );
}

// Use the List component
function App() {
  const names = Array.from({ length: 10000 }, (_, i) => `Item ${i}`);

  return (
    <div style={{ height: "400px" }}>
      <List
        rowComponent={RowComponent}
        rowCount={names.length}
        rowHeight={25}
        rowProps={{ names }}
        style={{ height: "100%", border: "1px solid #ccc" }}
      />
    </div>
  );
}
```

## List Component - Dynamic Row Heights

List with rows that have varying heights, automatically measured using ResizeObserver.

```tsx
import { List, useDynamicRowHeight, type RowComponentProps } from "react-window";
import { useState, useMemo } from "react";

// Row component with dynamic content
function DynamicRowComponent({
  index,
  listState,
  style
}: RowComponentProps<{
  listState: {
    getText: (index: number) => string;
    isRowCollapsed: (index: number) => boolean;
    toggleRow: (index: number) => void;
  };
}>) {
  const text = listState.getText(index);
  const isCollapsed = listState.isRowCollapsed(index);

  return (
    <div style={style}>
      <button onClick={() => listState.toggleRow(index)}>
        {isCollapsed ? "Expand" : "Collapse"}
      </button>
      {!isCollapsed && <p>{text}</p>}
    </div>
  );
}

function App() {
  const lorem = Array.from({ length: 100 }, (_, i) =>
    `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Row ${i}`
  );

  const [collapsedRows, setCollapsedRows] = useState<Set<number>>(new Set());

  const listState = useMemo(() => ({
    getText: (index: number) => lorem[index],
    isRowCollapsed: (index: number) => collapsedRows.has(index),
    toggleRow: (index: number) => {
      setCollapsedRows(prev => {
        const next = new Set(prev);
        next.has(index) ? next.delete(index) : next.add(index);
        return next;
      });
    }
  }), [lorem, collapsedRows]);

  const rowHeight = useDynamicRowHeight({
    defaultRowHeight: 50
  });

  return (
    <div style={{ height: "500px" }}>
      <List
        rowComponent={DynamicRowComponent}
        rowCount={lorem.length}
        rowHeight={rowHeight}
        rowProps={{ listState }}
        style={{ height: "100%" }}
      />
    </div>
  );
}
```

## List Component - Variable Row Heights

List with predetermined variable row heights using a height calculation function.

```tsx
import { List, type RowComponentProps } from "react-window";

function RowComponent({
  index,
  data,
  style
}: RowComponentProps<{
  data: Array<{ id: number; content: string; height: number }>;
}>) {
  return (
    <div style={style}>
      <strong>Item {data[index].id}</strong>
      <p>{data[index].content}</p>
    </div>
  );
}

function App() {
  const items = Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    content: `Content for item ${i}`,
    height: 30 + (i % 5) * 10 // Varying heights: 30, 40, 50, 60, 70
  }));

  // Function to calculate row height based on index
  const getRowHeight = (index: number) => items[index].height;

  return (
    <div style={{ height: "600px" }}>
      <List
        rowComponent={RowComponent}
        rowCount={items.length}
        rowHeight={getRowHeight}
        rowProps={{ data: items }}
        style={{ height: "100%" }}
      />
    </div>
  );
}
```

## List Component - Imperative Scrolling API

Using refs to programmatically scroll to specific rows with alignment and behavior options.

```tsx
import { List, useListRef, type RowComponentProps } from "react-window";
import { useCallback } from "react";

function RowComponent({
  index,
  items,
  style
}: RowComponentProps<{
  items: string[];
}>) {
  return (
    <div style={style} id={`row-${index}`}>
      {items[index]}
    </div>
  );
}

function App() {
  const items = Array.from({ length: 1000 }, (_, i) => `Item ${i}`);
  const listRef = useListRef(null);

  const scrollToRow = useCallback((rowIndex: number) => {
    listRef.current?.scrollToRow({
      index: rowIndex,
      align: "center", // "auto" | "center" | "end" | "smart" | "start"
      behavior: "smooth" // "auto" | "instant" | "smooth"
    });
  }, [listRef]);

  return (
    <div>
      <div style={{ marginBottom: "10px" }}>
        <button onClick={() => scrollToRow(0)}>Go to First</button>
        <button onClick={() => scrollToRow(500)}>Go to Middle</button>
        <button onClick={() => scrollToRow(999)}>Go to Last</button>
      </div>
      <div style={{ height: "400px" }}>
        <List
          listRef={listRef}
          rowComponent={RowComponent}
          rowCount={items.length}
          rowHeight={30}
          rowProps={{ items }}
          style={{ height: "100%" }}
        />
      </div>
    </div>
  );
}
```

## List Component - Callbacks and Event Handling

Tracking visible rows and responding to resize events for analytics or lazy loading.

```tsx
import { List, type RowComponentProps } from "react-window";
import { useState, useCallback } from "react";

function RowComponent({
  index,
  items,
  style
}: RowComponentProps<{
  items: string[];
}>) {
  return <div style={style}>{items[index]}</div>;
}

function App() {
  const items = Array.from({ length: 10000 }, (_, i) => `Item ${i}`);
  const [visibleRange, setVisibleRange] = useState({ start: 0, stop: 0 });
  const [listSize, setListSize] = useState({ height: 0, width: 0 });

  const handleRowsRendered = useCallback((
    visibleRows: { startIndex: number; stopIndex: number },
    allRows: { startIndex: number; stopIndex: number }
  ) => {
    setVisibleRange({ start: visibleRows.startIndex, stop: visibleRows.stopIndex });
    // Trigger data loading for visible range
    console.log("Visible rows:", visibleRows);
    console.log("All rows (with overscan):", allRows);
  }, []);

  const handleResize = useCallback((
    size: { height: number; width: number },
    prevSize: { height: number; width: number }
  ) => {
    setListSize(size);
    console.log("List resized from", prevSize, "to", size);
  }, []);

  return (
    <div>
      <div>
        Visible: rows {visibleRange.start} to {visibleRange.stop}
        (Size: {listSize.width}x{listSize.height}px)
      </div>
      <div style={{ height: "500px" }}>
        <List
          rowComponent={RowComponent}
          rowCount={items.length}
          rowHeight={25}
          rowProps={{ items }}
          onRowsRendered={handleRowsRendered}
          onResize={handleResize}
          overscanCount={5}
          style={{ height: "100%" }}
        />
      </div>
    </div>
  );
}
```

## Grid Component - Basic 2D Grid

Rendering a two-dimensional grid with fixed cell dimensions for tabular data.

```tsx
import { Grid, type CellComponentProps } from "react-window";

interface Contact {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  company: string;
  title: string;
  address: string;
}

const columnHeaders = [
  "firstName", "lastName", "email", "phone", "city",
  "country", "company", "title", "address", "id"
] as const;

function CellComponent({
  contacts,
  columnIndex,
  rowIndex,
  style
}: CellComponentProps<{
  contacts: Contact[];
}>) {
  const contact = contacts[rowIndex];
  const columnKey = columnHeaders[columnIndex];
  const content = contact[columnKey];

  return (
    <div
      style={{
        ...style,
        borderRight: "1px solid #ddd",
        borderBottom: "1px solid #ddd",
        padding: "5px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }}
    >
      {content}
    </div>
  );
}

function App() {
  const contacts: Contact[] = Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    firstName: `First${i}`,
    lastName: `Last${i}`,
    email: `user${i}@example.com`,
    phone: `555-${String(i).padStart(4, "0")}`,
    city: `City${i % 50}`,
    country: `Country${i % 20}`,
    company: `Company${i % 100}`,
    title: `Title${i % 10}`,
    address: `${i} Main St`
  }));

  return (
    <div style={{ height: "600px", width: "100%" }}>
      <Grid
        cellComponent={CellComponent}
        cellProps={{ contacts }}
        columnCount={10}
        columnWidth={150}
        rowCount={contacts.length}
        rowHeight={25}
        style={{ height: "100%", border: "1px solid #ccc" }}
      />
    </div>
  );
}
```

## Grid Component - Dynamic Column Widths

Grid with columns of varying widths using a width calculation function.

```tsx
import { Grid, type CellComponentProps } from "react-window";

const columnWidths = [50, 150, 200, 100, 120, 80, 150, 120, 180, 60];

function CellComponent({
  data,
  columnIndex,
  rowIndex,
  style
}: CellComponentProps<{
  data: string[][];
}>) {
  return (
    <div
      style={{
        ...style,
        border: "1px solid #e0e0e0",
        padding: "8px",
        backgroundColor: rowIndex % 2 === 0 ? "#fff" : "#f9f9f9"
      }}
    >
      {data[rowIndex][columnIndex]}
    </div>
  );
}

function App() {
  const data = Array.from({ length: 1000 }, (_, rowIndex) =>
    Array.from({ length: 10 }, (_, colIndex) =>
      `R${rowIndex}C${colIndex}`
    )
  );

  // Function to return column width based on column index
  const getColumnWidth = (index: number) => columnWidths[index] || 100;

  return (
    <div style={{ height: "500px", width: "100%" }}>
      <Grid
        cellComponent={CellComponent}
        cellProps={{ data }}
        columnCount={10}
        columnWidth={getColumnWidth}
        rowCount={data.length}
        rowHeight={40}
        style={{ height: "100%" }}
      />
    </div>
  );
}
```

## Grid Component - Imperative Scrolling

Programmatic scrolling to specific cells, rows, or columns in a grid.

```tsx
import { Grid, useGridRef, type CellComponentProps } from "react-window";
import { useCallback } from "react";

function CellComponent({
  columnIndex,
  rowIndex,
  style
}: CellComponentProps<object>) {
  return (
    <div style={{ ...style, border: "1px solid #ddd", padding: "5px" }}>
      Cell [{rowIndex}, {columnIndex}]
    </div>
  );
}

function App() {
  const gridRef = useGridRef(null);

  const scrollToCell = useCallback((rowIndex: number, columnIndex: number) => {
    gridRef.current?.scrollToCell({
      rowIndex,
      columnIndex,
      rowAlign: "center",
      columnAlign: "center",
      behavior: "smooth"
    });
  }, [gridRef]);

  const scrollToRow = useCallback((rowIndex: number) => {
    gridRef.current?.scrollToRow({
      index: rowIndex,
      align: "start",
      behavior: "smooth"
    });
  }, [gridRef]);

  const scrollToColumn = useCallback((columnIndex: number) => {
    gridRef.current?.scrollToColumn({
      index: columnIndex,
      align: "start",
      behavior: "smooth"
    });
  }, [gridRef]);

  return (
    <div>
      <div style={{ marginBottom: "10px" }}>
        <button onClick={() => scrollToCell(50, 5)}>Go to Cell [50, 5]</button>
        <button onClick={() => scrollToRow(100)}>Go to Row 100</button>
        <button onClick={() => scrollToColumn(8)}>Go to Column 8</button>
      </div>
      <div style={{ height: "500px", width: "100%" }}>
        <Grid
          gridRef={gridRef}
          cellComponent={CellComponent}
          cellProps={{}}
          columnCount={10}
          columnWidth={120}
          rowCount={1000}
          rowHeight={30}
          style={{ height: "100%" }}
        />
      </div>
    </div>
  );
}
```

## Grid Component - RTL (Right-to-Left) Support

Grid with right-to-left text direction support for internationalization.

```tsx
import { Grid, type CellComponentProps } from "react-window";

function CellComponent({
  data,
  columnIndex,
  rowIndex,
  style
}: CellComponentProps<{
  data: string[][];
}>) {
  return (
    <div
      style={{
        ...style,
        border: "1px solid #ddd",
        padding: "8px",
        textAlign: "right"
      }}
    >
      {data[rowIndex][columnIndex]}
    </div>
  );
}

function App() {
  const data = Array.from({ length: 100 }, (_, rowIndex) =>
    Array.from({ length: 10 }, (_, colIndex) =>
      `عنصر ${rowIndex}-${colIndex}` // Arabic text
    )
  );

  return (
    <div style={{ height: "600px", width: "100%" }}>
      <Grid
        cellComponent={CellComponent}
        cellProps={{ data }}
        columnCount={10}
        columnWidth={120}
        rowCount={data.length}
        rowHeight={35}
        dir="rtl" // Enable right-to-left rendering
        style={{ height: "100%" }}
      />
    </div>
  );
}
```

## Grid Component - Cell Rendering Callbacks

Monitoring visible cells and responding to grid resize events.

```tsx
import { Grid, type CellComponentProps } from "react-window";
import { useState, useCallback } from "react";

function CellComponent({
  columnIndex,
  rowIndex,
  style
}: CellComponentProps<object>) {
  return (
    <div style={{ ...style, border: "1px solid #eee", padding: "4px" }}>
      [{rowIndex}, {columnIndex}]
    </div>
  );
}

function App() {
  const [visibleCells, setVisibleCells] = useState({
    rowStart: 0, rowStop: 0, colStart: 0, colStop: 0
  });

  const handleCellsRendered = useCallback((
    visibleCells: {
      rowStartIndex: number;
      rowStopIndex: number;
      columnStartIndex: number;
      columnStopIndex: number;
    },
    allCells: {
      rowStartIndex: number;
      rowStopIndex: number;
      columnStartIndex: number;
      columnStopIndex: number;
    }
  ) => {
    setVisibleCells({
      rowStart: visibleCells.rowStartIndex,
      rowStop: visibleCells.rowStopIndex,
      colStart: visibleCells.columnStartIndex,
      colStop: visibleCells.columnStopIndex
    });
    console.log("Visible cells:", visibleCells);
    console.log("All cells (with overscan):", allCells);
  }, []);

  const handleResize = useCallback((
    size: { height: number; width: number }
  ) => {
    console.log("Grid resized:", size);
  }, []);

  return (
    <div>
      <div>
        Visible: rows {visibleCells.rowStart}-{visibleCells.rowStop},
        cols {visibleCells.colStart}-{visibleCells.colStop}
      </div>
      <div style={{ height: "400px", width: "100%" }}>
        <Grid
          cellComponent={CellComponent}
          cellProps={{}}
          columnCount={20}
          columnWidth={100}
          rowCount={1000}
          rowHeight={30}
          onCellsRendered={handleCellsRendered}
          onResize={handleResize}
          overscanCount={3}
          style={{ height: "100%" }}
        />
      </div>
    </div>
  );
}
```

## Utility - Get Scrollbar Size

Measuring the native scrollbar width for layout calculations and styling.

```tsx
import { getScrollbarSize } from "react-window";
import { useEffect, useState } from "react";

function App() {
  const [scrollbarSize, setScrollbarSize] = useState(0);

  useEffect(() => {
    // Get scrollbar size (cached after first call)
    const size = getScrollbarSize();
    setScrollbarSize(size);

    // Force recalculation
    const recalculatedSize = getScrollbarSize(true);
    console.log("Scrollbar size:", recalculatedSize, "px");
  }, []);

  return (
    <div>
      <p>Native scrollbar width: {scrollbarSize}px</p>
      <div
        style={{
          width: `calc(100% - ${scrollbarSize}px)`,
          height: "300px",
          overflow: "auto",
          border: "1px solid #ccc"
        }}
      >
        <div style={{ height: "1000px" }}>
          Content that scrolls
        </div>
      </div>
    </div>
  );
}
```

## Installation and TypeScript Setup

Installing the library and setting up TypeScript types.

```bash
# Install via npm
npm install react-window

# Install via yarn
yarn add react-window

# Install via pnpm
pnpm add react-window
```

```tsx
// TypeScript types are included automatically
import {
  List,
  Grid,
  useListRef,
  useGridRef,
  useDynamicRowHeight,
  type ListProps,
  type GridProps,
  type RowComponentProps,
  type CellComponentProps,
  type ListImperativeAPI,
  type GridImperativeAPI,
  type DynamicRowHeight,
  getScrollbarSize
} from "react-window";

// All components and utilities are fully typed
// No need for @types/react-window package
```

## Summary

react-window is primarily used for rendering large datasets in React applications where traditional rendering would cause performance issues. Common use cases include displaying logs with thousands of entries, rendering large tables with hundreds of columns and thousands of rows, building data grids for spreadsheet-like interfaces, implementing infinite scroll feeds with tens of thousands of items, and creating file browsers or directory trees with extensive nested structures. The library's windowing approach ensures consistent performance regardless of dataset size by only rendering visible elements.

Integration patterns typically involve wrapping List or Grid components in application-specific containers that manage data fetching, state management, and business logic while passing down minimal props to row or cell components. The library works seamlessly with state management solutions like Redux, Zustand, or React Context, allowing cellProps or rowProps to receive data from stores. For dynamic content, the useDynamicRowHeight hook automatically measures and caches row heights, while callback props like onRowsRendered and onCellsRendered enable implementing infinite scroll, lazy loading, and analytics tracking. The imperative scrolling APIs integrate with navigation features, search results, and keyboard shortcuts to provide rich user interactions.
