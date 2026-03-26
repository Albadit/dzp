<%@ WebHandler Language="C#" Class="AdvancedTable.DetectColumnsHandler" %>
<%@ Assembly Name="Newtonsoft.Json" %>
<%@ Assembly Name="DotNetNuke" %>

using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Web;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace AdvancedTable
{
    public class DetectColumnsHandler : IHttpHandler
    {
        public bool IsReusable { get { return false; } }

        public void ProcessRequest(HttpContext context)
        {
            context.Response.ContentType = "application/json";

            var user = DotNetNuke.Entities.Users.UserController.Instance.GetCurrentUserInfo();
            if (user == null || user.UserID < 0)
            {
                context.Response.StatusCode = 403;
                context.Response.Write("{\"error\":\"Unauthorized\"}");
                return;
            }

            string mode = (context.Request.Form["mode"] ?? "sql").Trim().ToLowerInvariant();

            try
            {
                List<string> columns;
                if (mode == "api")
                {
                    columns = DetectFromApi(context);
                }
                else
                {
                    columns = DetectFromSql(context);
                }

                string pk = columns.Count > 0 ? columns[0] : null;
                var result = columns.Select(c => new
                {
                    Key = c,
                    Label = c,
                    Type = (c == pk) ? "readonly" : "text"
                });

                context.Response.Write(JsonConvert.SerializeObject(new { success = true, columns = result }));
            }
            catch (Exception ex)
            {
                context.Response.Write(JsonConvert.SerializeObject(new { success = false, error = ex.Message }));
            }
        }

        private List<string> DetectFromSql(HttpContext context)
        {
            string query = (context.Request.Form["query"] ?? "").Trim();
            if (string.IsNullOrEmpty(query))
                throw new ArgumentException("No SELECT query provided.");

            string connStr = ConfigurationManager.ConnectionStrings["SiteSqlServer"] != null
                ? ConfigurationManager.ConnectionStrings["SiteSqlServer"].ConnectionString
                : "";
            if (string.IsNullOrEmpty(connStr))
                throw new InvalidOperationException("Database connection string not found.");

            using (var conn = new SqlConnection(connStr))
            {
                conn.Open();
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = query;
                    using (var reader = cmd.ExecuteReader(CommandBehavior.SchemaOnly))
                    {
                        return Enumerable.Range(0, reader.FieldCount)
                            .Select(i => reader.GetName(i))
                            .ToList();
                    }
                }
            }
        }

        private List<string> DetectFromApi(HttpContext context)
        {
            string baseUrl = (context.Request.Form["apiBaseUrl"] ?? "").Trim().TrimEnd('/');
            string path = (context.Request.Form["apiSelectPath"] ?? "").Trim();
            string method = (context.Request.Form["apiSelectMethod"] ?? "GET").Trim();
            string headers = context.Request.Form["apiHeaders"] ?? "";

            if (string.IsNullOrEmpty(baseUrl))
                throw new ArgumentException("No API Base URL provided.");

            string url = string.IsNullOrEmpty(path)
                ? baseUrl
                : baseUrl + "/" + path.TrimStart('/');

            var req = (HttpWebRequest)WebRequest.Create(url);
            req.Method = method;
            req.Timeout = 30000;

            if (!string.IsNullOrEmpty(headers))
            {
                string[] lines = headers.Split(new char[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
                for (int i = 0; i < lines.Length; i++)
                {
                    int idx = lines[i].IndexOf(':');
                    if (idx > 0)
                    {
                        string hName = lines[i].Substring(0, idx).Trim();
                        string hVal = lines[i].Substring(idx + 1).Trim();
                        if (string.Equals(hName, "Content-Type", StringComparison.OrdinalIgnoreCase))
                            req.ContentType = hVal;
                        else if (string.Equals(hName, "Accept", StringComparison.OrdinalIgnoreCase))
                            req.Accept = hVal;
                        else
                            req.Headers[hName] = hVal;
                    }
                }
            }

            string body;
            using (var resp = (HttpWebResponse)req.GetResponse())
            using (var sr = new StreamReader(resp.GetResponseStream(), Encoding.UTF8))
            {
                body = sr.ReadToEnd();
            }

            var token = JToken.Parse(body);
            JObject firstObj = null;

            var asArray = token as JArray;
            if (asArray != null && asArray.Count > 0)
            {
                firstObj = asArray[0] as JObject;
            }
            else
            {
                var asObj = token as JObject;
                if (asObj != null)
                {
                    foreach (var prop in asObj.Properties())
                    {
                        var propArr = prop.Value as JArray;
                        if (propArr != null && propArr.Count > 0)
                        {
                            var inner = propArr[0] as JObject;
                            if (inner != null)
                            {
                                firstObj = inner;
                                break;
                            }
                        }
                    }
                    if (firstObj == null)
                        firstObj = asObj;
                }
            }

            if (firstObj == null)
                throw new Exception("Could not detect columns from API response.");

            return firstObj.Properties().Select(p => p.Name).ToList();
        }
    }
}
