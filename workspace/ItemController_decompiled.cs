using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Web.Mvc;
using AdvancedTable.Components;
using AdvancedTable.Models;
using DotNetNuke.Entities.Users;
using DotNetNuke.Framework;
using DotNetNuke.Security.Roles;
using DotNetNuke.Web.Mvc.Framework.ActionFilters;
using DotNetNuke.Web.Mvc.Framework.Controllers;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace AdvancedTable.Controllers;

[DnnHandleError]
public class ItemController : DnnController
{
	private readonly ItemManager _itemManager = new ItemManager();

	[ModuleAction(ControlKey = "Edit", Title = "Configure Table")]
	public ActionResult Index()
	{
		DataTableViewModel dataTableViewModel = new DataTableViewModel();
		dataTableViewModel.TableId = "dt-mod-" + base.ModuleContext.ModuleId;
		Item item;
		try
		{
			item = _itemManager.GetItems(base.ModuleContext.ModuleId).FirstOrDefault();
		}
		catch
		{
			item = null;
		}
		if (item == null || string.IsNullOrEmpty(item.Description))
		{
			dataTableViewModel.ErrorMsg = "No configuration found. Please configure the module settings.";
			return View(dataTableViewModel);
		}
		DataTableConfig dataTableConfig;
		try
		{
			dataTableConfig = JsonConvert.DeserializeObject<DataTableConfig>(item.Description);
		}
		catch
		{
			dataTableConfig = null;
		}
		if (dataTableConfig == null)
		{
			dataTableViewModel.ErrorMsg = "Invalid configuration. Please reconfigure the module settings.";
			return View(dataTableViewModel);
		}
		dataTableConfig.Title = item.Title;
		ResolvePermissions(dataTableConfig);
		dataTableViewModel.Config = dataTableConfig;
		if (dataTableConfig.IsSql)
		{
			string connectionString = GetConnectionString();
			if (!string.IsNullOrEmpty(dataTableConfig.QuerySelect))
			{
				DiscoverColumns(dataTableConfig, connectionString);
			}
			if (base.Request.HttpMethod == "POST")
			{
				string text = base.Request.Form["_dt_action"] ?? "";
				if ((base.Request.Form["_dt_id"] ?? "") == dataTableViewModel.TableId && !string.IsNullOrEmpty(text))
				{
					HandleSqlAction(text, dataTableConfig, connectionString, dataTableViewModel);
				}
			}
			LoadSqlData(dataTableConfig, connectionString, dataTableViewModel);
		}
		else
		{
			if (base.Request.HttpMethod == "POST")
			{
				string text2 = base.Request.Form["_dt_action"] ?? "";
				if ((base.Request.Form["_dt_id"] ?? "") == dataTableViewModel.TableId && !string.IsNullOrEmpty(text2))
				{
					HandleApiAction(text2, dataTableConfig, dataTableViewModel);
				}
			}
			LoadApiData(dataTableConfig, dataTableViewModel);
		}
		dataTableViewModel.EditableColumns = (dataTableConfig.Columns ?? new DataTableColumn[0]).Where((DataTableColumn c) => c.Type != "readonly" && c.Type != "hidden").ToArray();
		dataTableViewModel.VisibleColumns = (dataTableConfig.Columns ?? new DataTableColumn[0]).Where((DataTableColumn c) => c.Type != "hidden").ToArray();
		dataTableViewModel.TotalRows = dataTableViewModel.Rows.Count;
		dataTableViewModel.GridCols = BuildGridCols(dataTableConfig, dataTableViewModel.VisibleColumns);
		return View(dataTableViewModel);
	}

	public ActionResult Edit(int itemId = 0)
	{
		Item item;
		try
		{
			item = _itemManager.GetItems(base.ModuleContext.ModuleId).FirstOrDefault();
		}
		catch
		{
			item = null;
		}
		DataTableConfig dataTableConfig = new DataTableConfig();
		if (item != null && !string.IsNullOrEmpty(item.Description))
		{
			try
			{
				dataTableConfig = JsonConvert.DeserializeObject<DataTableConfig>(item.Description) ?? new DataTableConfig();
				dataTableConfig.Title = item.Title;
			}
			catch
			{
				dataTableConfig = new DataTableConfig
				{
					Title = item.Title
				};
			}
		}
		PopulateRolesAndUsers();
		return View(dataTableConfig);
	}

	private void PopulateRolesAndUsers()
	{
		int portalId = base.ModuleContext.PortalId;
		List<string> list = (from r in ServiceLocator<IRoleController, RoleController>.Instance.GetRoles(portalId)
			orderby r.RoleName
			select r.RoleName).ToList();
		int totalRecords = 0;
		List<string> list2 = (from UserInfo u in UserController.GetUsers(portalId, -1, -1, ref totalRecords)
			orderby u.Username
			select u.Username).ToList();
		base.ViewBag.DnnRoles = list;
		base.ViewBag.DnnUsers = list2;
	}

	[HttpPost]
	public ActionResult Edit(DataTableConfig config)
	{
		if (config == null)
		{
			config = new DataTableConfig();
		}
		string value = base.Request.Form["ColumnsJson"];
		if (!string.IsNullOrEmpty(value))
		{
			config.Columns = JsonConvert.DeserializeObject<DataTableColumn[]>(value);
		}
		else
		{
			config.Columns = null;
		}
		string value2 = base.Request.Form["PermissionsJson"];
		if (!string.IsNullOrEmpty(value2))
		{
			config.Permissions = JsonConvert.DeserializeObject<List<PermissionRule>>(value2);
		}
		else
		{
			config.Permissions = null;
		}
		Item item;
		try
		{
			item = _itemManager.GetItems(base.ModuleContext.ModuleId).FirstOrDefault();
		}
		catch
		{
			item = null;
		}
		int userID = ServiceLocator<IUserController, UserController>.Instance.GetCurrentUserInfo().UserID;
		string title = config.Title ?? "";
		config.Title = null;
		string description = JsonConvert.SerializeObject(config);
		config.Title = title;
		if (item == null)
		{
			item = new Item
			{
				ModuleId = base.ModuleContext.ModuleId,
				Title = title,
				Description = description,
				CreatedByUserId = userID,
				CreatedOnDate = DateTime.Now
			};
			_itemManager.AddItem(item);
		}
		else
		{
			item.Title = title;
			item.Description = description;
			item.LastModifiedByUserId = userID;
			item.LastModifiedOnDate = DateTime.Now;
			_itemManager.UpdateItem(item);
		}
		return RedirectToDefaultRoute();
	}

	public ActionResult Delete(int itemId)
	{
		_itemManager.DeleteItem(itemId, base.ModuleContext.ModuleId);
		return RedirectToDefaultRoute();
	}

	private static string GetConnectionString()
	{
		return ConfigurationManager.ConnectionStrings["SiteSqlServer"]?.ConnectionString ?? "";
	}

	private void DiscoverColumns(DataTableConfig config, string connStr)
	{
		if (string.IsNullOrEmpty(connStr) || string.IsNullOrEmpty(config.QuerySelect))
		{
			return;
		}
		try
		{
			using SqlConnection sqlConnection = new SqlConnection(connStr);
			sqlConnection.Open();
			using SqlCommand sqlCommand = sqlConnection.CreateCommand();
			sqlCommand.CommandText = config.QuerySelect;
			SqlDataReader reader = sqlCommand.ExecuteReader(CommandBehavior.SchemaOnly);
			try
			{
				List<string> source = (from i in Enumerable.Range(0, reader.FieldCount)
					select reader.GetName(i)).ToList();
				config.PrimaryKey = source.FirstOrDefault();
				if (config.Columns == null || config.Columns.Length == 0)
				{
					config.Columns = source.Select((string c) => new DataTableColumn
					{
						Key = c,
						Label = c,
						Type = ((c == config.PrimaryKey) ? "readonly" : "text")
					}).ToArray();
				}
			}
			finally
			{
				if (reader != null)
				{
					((IDisposable)reader).Dispose();
				}
			}
		}
		catch
		{
		}
	}

	private void HandleSqlAction(string action, DataTableConfig config, string connStr, DataTableViewModel vm)
	{
		DataTableColumn[] array = (config.Columns ?? new DataTableColumn[0]).Where((DataTableColumn c) => c.Type != "readonly" && c.Type != "hidden").ToArray();
		try
		{
			using SqlConnection sqlConnection = new SqlConnection(connStr);
			sqlConnection.Open();
			if (action == "create" && config.AllowCreate && !string.IsNullOrEmpty(config.QueryInsert))
			{
				using (SqlCommand sqlCommand = sqlConnection.CreateCommand())
				{
					DataTableColumn[] array2 = array;
					foreach (DataTableColumn dataTableColumn in array2)
					{
						string text = (base.Request.Form["_dt_new_" + dataTableColumn.Key] ?? "").Trim();
						if (dataTableColumn.Required && string.IsNullOrEmpty(text))
						{
							vm.ErrorMsg = dataTableColumn.Label + " is required.";
							return;
						}
						sqlCommand.Parameters.AddWithValue("@" + dataTableColumn.Key, ((object)text) ?? ((object)DBNull.Value));
					}
					sqlCommand.CommandText = config.QueryInsert;
					sqlCommand.ExecuteNonQuery();
					vm.SuccessMsg = "Row created.";
					return;
				}
			}
			if (action == "update" && config.AllowEdit && !string.IsNullOrEmpty(config.QueryUpdate))
			{
				string value = base.Request.Form["_dt_edit_pk"] ?? "";
				if (string.IsNullOrEmpty(value))
				{
					return;
				}
				using SqlCommand sqlCommand2 = sqlConnection.CreateCommand();
				DataTableColumn[] array2 = array;
				foreach (DataTableColumn dataTableColumn2 in array2)
				{
					string text2 = (base.Request.Form["_dt_edit_" + dataTableColumn2.Key] ?? "").Trim();
					if (dataTableColumn2.Required && string.IsNullOrEmpty(text2))
					{
						vm.ErrorMsg = dataTableColumn2.Label + " is required.";
						return;
					}
					sqlCommand2.Parameters.AddWithValue("@" + dataTableColumn2.Key, ((object)text2) ?? ((object)DBNull.Value));
				}
				sqlCommand2.Parameters.AddWithValue("@pk", value);
				sqlCommand2.CommandText = config.QueryUpdate;
				sqlCommand2.ExecuteNonQuery();
				vm.SuccessMsg = "Row updated.";
				return;
			}
			if (action == "delete" && config.AllowDelete && !string.IsNullOrEmpty(config.QueryDelete))
			{
				string value2 = base.Request.Form["_dt_del_pk"] ?? "";
				if (!string.IsNullOrEmpty(value2))
				{
					using (SqlCommand sqlCommand3 = sqlConnection.CreateCommand())
					{
						sqlCommand3.Parameters.AddWithValue("@pk", value2);
						sqlCommand3.CommandText = config.QueryDelete;
						sqlCommand3.ExecuteNonQuery();
						vm.SuccessMsg = "Row deleted.";
						return;
					}
				}
			}
			else
			{
				if (!(action == "bulkdelete") || !config.AllowBulkDelete || string.IsNullOrEmpty(config.QueryBulkDelete))
				{
					return;
				}
				string[] array3 = (base.Request.Form["_dt_bulk_ids"] ?? "").Split(new char[1] { ',' }, StringSplitOptions.RemoveEmptyEntries);
				if (array3.Length == 0)
				{
					return;
				}
				using SqlCommand sqlCommand4 = sqlConnection.CreateCommand();
				List<string> list = new List<string>();
				for (int num2 = 0; num2 < array3.Length; num2++)
				{
					list.Add("@id" + num2);
					sqlCommand4.Parameters.AddWithValue("@id" + num2, array3[num2].Trim());
				}
				sqlCommand4.CommandText = config.QueryBulkDelete.Replace("{ids}", string.Join(",", list));
				vm.SuccessMsg = sqlCommand4.ExecuteNonQuery() + " row(s) deleted.";
				return;
			}
		}
		catch (SqlException ex)
		{
			if (ex.Number == 2627 || ex.Number == 2601)
			{
				vm.ErrorMsg = "A record with that value already exists (duplicate key).";
			}
			else
			{
				vm.ErrorMsg = "Error: " + ex.Message;
			}
		}
		catch (Exception ex2)
		{
			vm.ErrorMsg = "Error: " + ex2.Message;
		}
	}

	private void LoadSqlData(DataTableConfig config, string connStr, DataTableViewModel vm)
	{
		if (string.IsNullOrEmpty(connStr))
		{
			vm.ErrorMsg = "No database connection available.";
			return;
		}
		if (string.IsNullOrEmpty(config.QuerySelect))
		{
			vm.ErrorMsg = "No SQL Select query configured.";
			return;
		}
		try
		{
			using SqlConnection sqlConnection = new SqlConnection(connStr);
			sqlConnection.Open();
			using SqlCommand sqlCommand = sqlConnection.CreateCommand();
			sqlCommand.CommandText = config.QuerySelect;
			using SqlDataReader sqlDataReader = sqlCommand.ExecuteReader();
			while (sqlDataReader.Read())
			{
				Dictionary<string, object> dictionary = new Dictionary<string, object>();
				for (int i = 0; i < sqlDataReader.FieldCount; i++)
				{
					dictionary[sqlDataReader.GetName(i)] = (sqlDataReader.IsDBNull(i) ? null : sqlDataReader.GetValue(i));
				}
				vm.Rows.Add(dictionary);
			}
		}
		catch (Exception ex)
		{
			vm.ErrorMsg = "Failed to load data: " + ex.Message;
		}
	}

	private HttpClient BuildApiClient(DataTableConfig config)
	{
		//IL_0000: Unknown result type (might be due to invalid IL or missing references)
		//IL_0006: Expected O, but got Unknown
		HttpClient val = new HttpClient();
		if (!string.IsNullOrEmpty(config.ApiHeaders))
		{
			string[] array = config.ApiHeaders.Split(new char[2] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
			foreach (string text in array)
			{
				int num = text.IndexOf(':');
				if (num > 0)
				{
					string text2 = text.Substring(0, num).Trim();
					string text3 = text.Substring(num + 1).Trim();
					((HttpHeaders)val.DefaultRequestHeaders).TryAddWithoutValidation(text2, text3);
				}
			}
		}
		return val;
	}

	private string BuildApiUrl(DataTableConfig config, string path)
	{
		string text = (config.ApiBaseUrl ?? "").TrimEnd('/');
		if (string.IsNullOrEmpty(path))
		{
			return text;
		}
		return text + "/" + path.TrimStart('/');
	}

	private void LoadApiData(DataTableConfig config, DataTableViewModel vm)
	{
		//IL_0065: Unknown result type (might be due to invalid IL or missing references)
		//IL_0070: Expected O, but got Unknown
		//IL_006b: Unknown result type (might be due to invalid IL or missing references)
		//IL_0071: Expected O, but got Unknown
		if (string.IsNullOrEmpty(config.ApiBaseUrl))
		{
			vm.ErrorMsg = "No API Base URL configured.";
			return;
		}
		try
		{
			HttpClient val = BuildApiClient(config);
			try
			{
				string text = BuildApiUrl(config, config.ApiSelectPath);
				HttpRequestMessage val2 = new HttpRequestMessage(new HttpMethod(config.ApiSelectMethod ?? "GET"), text);
				HttpResponseMessage result = val.SendAsync(val2).Result;
				string result2 = result.Content.ReadAsStringAsync().Result;
				if (!result.IsSuccessStatusCode)
				{
					vm.ErrorMsg = "API returned " + (int)result.StatusCode + ": " + TruncateMessage(result2);
					return;
				}
				List<Dictionary<string, object>> collection = ParseJsonToRows(result2, config);
				vm.Rows.AddRange(collection);
				if ((config.Columns == null || config.Columns.Length == 0) && vm.Rows.Count > 0)
				{
					List<string> source = vm.Rows[0].Keys.ToList();
					config.PrimaryKey = source.FirstOrDefault();
					config.Columns = source.Select((string k) => new DataTableColumn
					{
						Key = k,
						Label = k,
						Type = ((k == config.PrimaryKey) ? "readonly" : "text")
					}).ToArray();
				}
			}
			finally
			{
				((IDisposable)val)?.Dispose();
			}
		}
		catch (Exception ex)
		{
			vm.ErrorMsg = "API error: " + ex.Message;
		}
	}

	private void HandleApiAction(string action, DataTableConfig config, DataTableViewModel vm)
	{
		//IL_011e: Unknown result type (might be due to invalid IL or missing references)
		//IL_0129: Expected O, but got Unknown
		//IL_0124: Unknown result type (might be due to invalid IL or missing references)
		//IL_0129: Unknown result type (might be due to invalid IL or missing references)
		//IL_013a: Unknown result type (might be due to invalid IL or missing references)
		//IL_0144: Expected O, but got Unknown
		//IL_0146: Expected O, but got Unknown
		//IL_0402: Unknown result type (might be due to invalid IL or missing references)
		//IL_040e: Expected O, but got Unknown
		//IL_0409: Unknown result type (might be due to invalid IL or missing references)
		//IL_0410: Expected O, but got Unknown
		//IL_051b: Unknown result type (might be due to invalid IL or missing references)
		//IL_0527: Expected O, but got Unknown
		//IL_0522: Unknown result type (might be due to invalid IL or missing references)
		//IL_0529: Expected O, but got Unknown
		//IL_02e6: Unknown result type (might be due to invalid IL or missing references)
		//IL_02f2: Expected O, but got Unknown
		//IL_02ed: Unknown result type (might be due to invalid IL or missing references)
		//IL_02f2: Unknown result type (might be due to invalid IL or missing references)
		//IL_0304: Unknown result type (might be due to invalid IL or missing references)
		//IL_030e: Expected O, but got Unknown
		//IL_0310: Expected O, but got Unknown
		DataTableColumn[] array = (config.Columns ?? new DataTableColumn[0]).Where((DataTableColumn c) => c.Type != "readonly" && c.Type != "hidden").ToArray();
		try
		{
			HttpClient val = BuildApiClient(config);
			try
			{
				if (action == "create" && config.AllowCreate && !string.IsNullOrEmpty(config.ApiInsertPath))
				{
					Dictionary<string, string> dictionary = new Dictionary<string, string>();
					DataTableColumn[] array2 = array;
					foreach (DataTableColumn dataTableColumn in array2)
					{
						string value = (base.Request.Form["_dt_new_" + dataTableColumn.Key] ?? "").Trim();
						if (dataTableColumn.Required && string.IsNullOrEmpty(value))
						{
							vm.ErrorMsg = dataTableColumn.Label + " is required.";
							return;
						}
						dictionary[dataTableColumn.Key] = value;
					}
					string text = BuildApiUrl(config, config.ApiInsertPath);
					HttpRequestMessage val2 = new HttpRequestMessage(new HttpMethod(config.ApiInsertMethod ?? "POST"), text)
					{
						Content = (HttpContent)new StringContent(JsonConvert.SerializeObject(dictionary), Encoding.UTF8, "application/json")
					};
					HttpResponseMessage result = val.SendAsync(val2).Result;
					if (result.IsSuccessStatusCode)
					{
						vm.SuccessMsg = "Row created.";
					}
					else
					{
						vm.ErrorMsg = "API error " + (int)result.StatusCode + ": " + TruncateMessage(result.Content.ReadAsStringAsync().Result);
					}
				}
				else if (action == "update" && config.AllowEdit && !string.IsNullOrEmpty(config.ApiUpdatePath))
				{
					string text2 = base.Request.Form["_dt_edit_pk"] ?? "";
					if (string.IsNullOrEmpty(text2))
					{
						return;
					}
					Dictionary<string, string> dictionary2 = new Dictionary<string, string>();
					dictionary2[config.PrimaryKey ?? "id"] = text2;
					DataTableColumn[] array2 = array;
					foreach (DataTableColumn dataTableColumn2 in array2)
					{
						string value2 = (base.Request.Form["_dt_edit_" + dataTableColumn2.Key] ?? "").Trim();
						if (dataTableColumn2.Required && string.IsNullOrEmpty(value2))
						{
							vm.ErrorMsg = dataTableColumn2.Label + " is required.";
							return;
						}
						dictionary2[dataTableColumn2.Key] = value2;
					}
					string path = config.ApiUpdatePath.Replace("{pk}", Uri.EscapeDataString(text2));
					string text3 = BuildApiUrl(config, path);
					HttpRequestMessage val3 = new HttpRequestMessage(new HttpMethod(config.ApiUpdateMethod ?? "PUT"), text3)
					{
						Content = (HttpContent)new StringContent(JsonConvert.SerializeObject(dictionary2), Encoding.UTF8, "application/json")
					};
					HttpResponseMessage result2 = val.SendAsync(val3).Result;
					if (result2.IsSuccessStatusCode)
					{
						vm.SuccessMsg = "Row updated.";
					}
					else
					{
						vm.ErrorMsg = "API error " + (int)result2.StatusCode + ": " + TruncateMessage(result2.Content.ReadAsStringAsync().Result);
					}
				}
				else if (action == "delete" && config.AllowDelete && !string.IsNullOrEmpty(config.ApiDeletePath))
				{
					string text4 = base.Request.Form["_dt_del_pk"] ?? "";
					if (!string.IsNullOrEmpty(text4))
					{
						string path2 = config.ApiDeletePath.Replace("{pk}", Uri.EscapeDataString(text4));
						string text5 = BuildApiUrl(config, path2);
						HttpRequestMessage val4 = new HttpRequestMessage(new HttpMethod(config.ApiDeleteMethod ?? "DELETE"), text5);
						HttpResponseMessage result3 = val.SendAsync(val4).Result;
						if (result3.IsSuccessStatusCode)
						{
							vm.SuccessMsg = "Row deleted.";
						}
						else
						{
							vm.ErrorMsg = "API error " + (int)result3.StatusCode + ": " + TruncateMessage(result3.Content.ReadAsStringAsync().Result);
						}
					}
				}
				else
				{
					if (!(action == "bulkdelete") || !config.AllowBulkDelete || string.IsNullOrEmpty(config.ApiDeletePath))
					{
						return;
					}
					string[] array3 = (base.Request.Form["_dt_bulk_ids"] ?? "").Split(new char[1] { ',' }, StringSplitOptions.RemoveEmptyEntries);
					int num2 = 0;
					string[] array4 = array3;
					foreach (string text6 in array4)
					{
						string path3 = config.ApiDeletePath.Replace("{pk}", Uri.EscapeDataString(text6.Trim()));
						string text7 = BuildApiUrl(config, path3);
						HttpRequestMessage val5 = new HttpRequestMessage(new HttpMethod(config.ApiDeleteMethod ?? "DELETE"), text7);
						if (val.SendAsync(val5).Result.IsSuccessStatusCode)
						{
							num2++;
						}
					}
					vm.SuccessMsg = num2 + " row(s) deleted.";
				}
			}
			finally
			{
				((IDisposable)val)?.Dispose();
			}
		}
		catch (Exception ex)
		{
			vm.ErrorMsg = "API error: " + ex.Message;
		}
	}

	private List<Dictionary<string, object>> ParseJsonToRows(string json, DataTableConfig config)
	{
		List<Dictionary<string, object>> list = new List<Dictionary<string, object>>();
		JToken jToken = JToken.Parse(json);
		JArray jArray;
		if (jToken is JArray)
		{
			jArray = (JArray)jToken;
		}
		else
		{
			if (!(jToken is JObject))
			{
				return list;
			}
			JObject jObject = (JObject)jToken;
			jArray = (jObject["data"] ?? jObject["results"] ?? jObject["items"] ?? jObject["rows"] ?? jObject["records"]) as JArray;
			if (jArray == null)
			{
				jArray = new JArray(jToken);
			}
		}
		foreach (JToken item in jArray)
		{
			if (!(item is JObject jObject2))
			{
				continue;
			}
			Dictionary<string, object> dictionary = new Dictionary<string, object>();
			foreach (JProperty item2 in jObject2.Properties())
			{
				dictionary[item2.Name] = ((item2.Value.Type == JTokenType.Null) ? null : item2.Value.ToString());
			}
			list.Add(dictionary);
		}
		return list;
	}

	private static string TruncateMessage(string msg)
	{
		if (string.IsNullOrEmpty(msg))
		{
			return "";
		}
		if (msg.Length <= 200)
		{
			return msg;
		}
		return msg.Substring(0, 200) + "...";
	}

	private void ResolvePermissions(DataTableConfig config)
	{
		if (config.Permissions == null || config.Permissions.Count == 0)
		{
			return;
		}
		UserInfo currentUserInfo = ServiceLocator<IUserController, UserController>.Instance.GetCurrentUserInfo();
		if (currentUserInfo == null || currentUserInfo.UserID < 0)
		{
			config.AllowCreate = false;
			config.AllowEdit = false;
			config.AllowDelete = false;
			config.AllowBulkDelete = false;
		}
		bool flag = false;
		bool allowCreate = false;
		bool allowEdit = false;
		bool allowDelete = false;
		bool allowBulkDelete = false;
		foreach (PermissionRule permission in config.Permissions)
		{
			bool flag2 = false;
			if (string.Equals(permission.Type, "role", StringComparison.OrdinalIgnoreCase))
			{
				if (currentUserInfo != null && currentUserInfo.UserID >= 0 && currentUserInfo.IsInRole(permission.Name))
				{
					flag2 = true;
				}
			}
			else if (string.Equals(permission.Type, "user", StringComparison.OrdinalIgnoreCase) && currentUserInfo != null && string.Equals(currentUserInfo.Username, permission.Name, StringComparison.OrdinalIgnoreCase))
			{
				flag2 = true;
			}
			if (flag2)
			{
				flag = true;
				if (permission.AllowCreate)
				{
					allowCreate = true;
				}
				if (permission.AllowEdit)
				{
					allowEdit = true;
				}
				if (permission.AllowDelete)
				{
					allowDelete = true;
				}
				if (permission.AllowBulkDelete)
				{
					allowBulkDelete = true;
				}
			}
		}
		if (flag)
		{
			config.AllowCreate = allowCreate;
			config.AllowEdit = allowEdit;
			config.AllowDelete = allowDelete;
			config.AllowBulkDelete = allowBulkDelete;
		}
		else
		{
			config.AllowCreate = false;
			config.AllowEdit = false;
			config.AllowDelete = false;
			config.AllowBulkDelete = false;
		}
	}

	private static string BuildGridCols(DataTableConfig config, DataTableColumn[] visibleColumns)
	{
		List<string> list = new List<string>();
		if (config.AllowBulkDelete)
		{
			list.Add("2.5rem");
		}
		foreach (DataTableColumn dataTableColumn in visibleColumns)
		{
			list.Add((dataTableColumn.Type == "readonly") ? "auto" : "1fr");
		}
		if (config.AllowEdit || config.AllowDelete)
		{
			list.Add("6rem");
		}
		return string.Join(" ", list);
	}
}
