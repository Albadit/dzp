namespace DnnDev.Routing.Models
{
    public class DataTableColumn
    {
        public string Key { get; set; }
        public string Label { get; set; }
        public string Type { get; set; }
        public bool Required { get; set; }
        public bool Sortable { get; set; }
        public bool Filterable { get; set; }
        public string Placeholder { get; set; }
        public int? MaxLength { get; set; }
        public string Pattern { get; set; }
        public string PatternMessage { get; set; }

        public DataTableColumn()
        {
            Type = "text";
            Sortable = true;
            Filterable = true;
        }
    }

    public class DataTableConfig
    {
        public string TableId { get; set; }
        public string Title { get; set; }
        public string DbTable { get; set; }
        public string PrimaryKey { get; set; }
        public DataTableColumn[] Columns { get; set; }
        public bool AllowCreate { get; set; }
        public bool AllowEdit { get; set; }
        public bool AllowDelete { get; set; }
        public bool AllowBulkDelete { get; set; }
        public string SqlSelect { get; set; }
        public string SqlInsert { get; set; }
        public string SqlUpdate { get; set; }
        public string SqlDelete { get; set; }
        public string SqlBulkDelete { get; set; }

        public DataTableConfig()
        {
            TableId = "dt-" + System.Guid.NewGuid().ToString("N").Substring(0, 8);
            AllowCreate = true;
            AllowEdit = true;
            AllowDelete = true;
            AllowBulkDelete = true;
        }
    }
}
