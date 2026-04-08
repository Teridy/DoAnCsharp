using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("update_requests")]
public class UpdateRequest
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Column("entity_id")] 
    public int EntityId { get; set; } // ID của Audio hoặc Stall cần sửa

    [Column("entity_type")]
    public string EntityType { get; set; } = "Audio"; // "Audio" hoặc "Stall"

    [Column("new_data_json")]
    public string NewDataJson { get; set; } = string.Empty; // Lưu object mới dưới dạng chuỗi JSON

    [Column("requester_id")]
    public string RequesterId { get; set; } = string.Empty; // ID của người bán (OwnerId)

    [Column("status")]
    public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected

    [Column("admin_note")]
    public string? AdminNote { get; set; } // Lý do nếu Admin từ chối

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}