using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("users_web")]
public class UserWeb
{
    [Key]
    [Column("user_name")]
    public string UserName { get; set; }

   [Column("hashpass")] 
    public string HashPass { get; set; }

    [Column("user_role")]
    public string UserRole { get; set; }

    [Column("email")]
    public string Email { get; set; }

    [Column("phone")]
    public string Phone { get; set; }
    [Column("status")]
    public string Status { get; set; }
}