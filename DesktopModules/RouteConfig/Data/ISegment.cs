using System.Collections.Generic;

namespace DnnDev.Routing.Data
{
    /// <summary>
    /// Contract for a dynamic route segment's data access.
    /// Implement once per [param] page (e.g. Community for [community]).
    ///
    /// Register the instance in <see cref="Constants.Segments"/> so RouteConfig
    /// picks it up automatically at every page depth.
    /// </summary>
    public interface ISegment
    {
        /// <summary>The param name without brackets, e.g. "community".</summary>
        string ParamName { get; }

        // ── Routing ──────────────────────────────────────────────────

        /// <summary>Returns true when <paramref name="slug"/> exists in the database.</summary>
        bool IsValidSlug(string slug);

        /// <summary>
        /// When a URL literally contains the template page name (e.g. /[community]/home),
        /// resolve the authenticated user to an actual redirect URL.
        /// Return null to skip (no redirect needed).
        /// </summary>
        string ResolveTemplateRedirect(string username);

        /// <summary>
        /// Check whether <paramref name="username"/> may access the segment
        /// identified by <paramref name="slugValue"/>.
        /// Return null when access is allowed, or a redirect URL when denied.
        /// </summary>
        string CheckAccess(string username, string slugValue);

        // ── Data queries (used by DzpContext / skin partials) ────────

        /// <summary>Get the display name for a slug (e.g. community name). Empty if unknown.</summary>
        string GetNameBySlug(string slug);

        /// <summary>Get the slugs accessible to a user (by DNN user ID).</summary>
        List<string> GetUserSlugsById(int userId);

        /// <summary>Count how many entities the user belongs to (or total for superusers).</summary>
        int GetUserEntityCount(int userId, bool isSuperUser);
    }
}
